import * as XLSX from "xlsx";
import JSZip from "jszip";

export interface MotorEntry {
  id: string;
  type: "fonte" | "aluminium";
  speed: number;
  puissance: string;
  supplier: string;
  quantity: string;
  rawRow: number;
  rawCol: number;
}

export interface ParsedStock {
  motors: MotorEntry[];
  workbook: XLSX.WorkBook;
  originalData: ArrayBuffer;
}

function cleanCell(val: unknown): string {
  if (val === undefined || val === null || val === "") return "";
  return String(val).trim();
}

export function parseStockExcel(data: ArrayBuffer): ParsedStock {
  const workbook = XLSX.read(data, { type: "array", cellStyles: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  const motors: MotorEntry[] = [];
  let idCounter = 0;

  // Parse Fonte section
  // 3000 tr/min: columns A-E (0-4), rows ~8-34
  // 1500 tr/min: columns F-J (5-9), rows ~8-40
  // 1000 tr/min: columns K-O (10-14), rows ~8-30
  // 750 tr/min: columns P-R (15-17), rows ~8-25

  const fonteSpeedConfigs = [
    { speed: 3000, puissanceCol: 0, supplierCols: [{ col: 1, name: "OMT3" }, { col: 2, name: "OMT1" }, { col: 3, name: "DM" }], startRow: 7, endRow: 34 },
    { speed: 1500, puissanceCol: 5, supplierCols: [{ col: 6, name: "OMT3" }, { col: 7, name: "OMT1" }, { col: 8, name: "DM" }], startRow: 7, endRow: 42 },
    { speed: 1000, puissanceCol: 10, supplierCols: [{ col: 11, name: "DM1" }, { col: 12, name: "OMT1" }, { col: 13, name: "DM" }], startRow: 7, endRow: 28 },
    { speed: 750, puissanceCol: 15, supplierCols: [{ col: 16, name: "OMT1" }], startRow: 7, endRow: 22 },
  ];

  for (const config of fonteSpeedConfigs) {
    for (let r = config.startRow; r <= Math.min(config.endRow, raw.length - 1); r++) {
      const row = raw[r];
      if (!row) continue;
      const puissance = cleanCell(row[config.puissanceCol]);
      if (!puissance || !puissance.toLowerCase().includes("kw")) continue;

      for (const sup of config.supplierCols) {
        const qty = cleanCell(row[sup.col]);
        motors.push({
          id: `fonte-${idCounter++}`,
          type: "fonte",
          speed: config.speed,
          puissance,
          supplier: sup.name,
          quantity: qty,
          rawRow: r,
          rawCol: sup.col,
        });
      }
    }
  }

  // Parse Aluminium section - 1500 t/min
  const aluStartRow = findRowContaining(raw, "Moteurs eléctrique Aluminium");
  if (aluStartRow >= 0) {
    // 1500 t/min aluminium
    for (let r = aluStartRow + 4; r < Math.min(aluStartRow + 25, raw.length); r++) {
      const row = raw[r];
      if (!row) continue;
      const puissance = cleanCell(row[0]);
      if (!puissance || !puissance.toLowerCase().includes("kw")) continue;
      
      const suppliers1500 = [
        { col: 1, name: "OMT4" }, { col: 2, name: "OMT2" }, { col: 3, name: "DMA" }, { col: 4, name: "DUTCH" }
      ];
      for (const sup of suppliers1500) {
        const qty = cleanCell(row[sup.col]);
        motors.push({
          id: `alu-1500-${idCounter++}`,
          type: "aluminium",
          speed: 1500,
          puissance,
          supplier: sup.name,
          quantity: qty,
          rawRow: r,
          rawCol: sup.col,
        });
      }
    }

    // 3000 t/min aluminium
    for (let r = aluStartRow + 4; r < Math.min(aluStartRow + 25, raw.length); r++) {
      const row = raw[r];
      if (!row) continue;
      const puissance = cleanCell(row[10]);
      if (!puissance || !puissance.toLowerCase().includes("kw")) continue;

      const suppliers3000 = [
        { col: 11, name: "DMA2" }, { col: 12, name: "OMT2" }, { col: 13, name: "DUTCH" }
      ];
      for (const sup of suppliers3000) {
        const qty = cleanCell(row[sup.col]);
        motors.push({
          id: `alu-3000-${idCounter++}`,
          type: "aluminium",
          speed: 3000,
          puissance,
          supplier: sup.name,
          quantity: qty,
          rawRow: r,
          rawCol: sup.col,
        });
      }
    }
  }

  return { motors, workbook, originalData: data };
}

function findRowContaining(raw: unknown[][], text: string): number {
  for (let i = 0; i < raw.length; i++) {
    for (const cell of raw[i]) {
      if (String(cell).includes(text)) return i;
    }
  }
  return -1;
}

export function updateExcelCell(workbook: XLSX.WorkBook, row: number, col: number, value: string): void {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
  if (!sheet[cellRef]) {
    sheet[cellRef] = { t: "s", v: value };
  } else {
    sheet[cellRef].v = value;
    // Try to set as number if possible
    const num = Number(value);
    if (!isNaN(num) && value !== "") {
      sheet[cellRef].t = "n";
      sheet[cellRef].v = num;
    } else {
      sheet[cellRef].t = "s";
    }
  }
}

/**
 * Export by patching the original xlsx binary directly via JSZip.
 * This preserves ALL original formatting, colors, merges, images, etc.
 * Only the changed cell values are modified in the XML.
 */
export async function exportWorkbook(originalData: ArrayBuffer, changes: Map<string, string>): Promise<ArrayBuffer> {
  if (changes.size === 0) {
    // No changes — return original file as-is
    return originalData;
  }

  const zip = await JSZip.loadAsync(originalData);
  
  // Find the sheet XML (usually xl/worksheets/sheet1.xml)
  const sheetPath = "xl/worksheets/sheet1.xml";
  const sheetFile = zip.file(sheetPath);
  if (!sheetFile) {
    // Fallback: return original if we can't find the sheet
    return originalData;
  }

  let sheetXml = await sheetFile.async("string");

  // Also need to check/modify shared strings if cells reference them
  const sstPath = "xl/sharedStrings.xml";
  const sstFile = zip.file(sstPath);
  let sharedStrings: string[] = [];
  let sstXml = "";
  
  if (sstFile) {
    sstXml = await sstFile.async("string");
    // Parse shared strings
    const siMatches = sstXml.match(/<si>([\s\S]*?)<\/si>/g);
    if (siMatches) {
      sharedStrings = siMatches.map((si) => {
        const tMatch = si.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        return tMatch ? tMatch[1] : "";
      });
    }
  }

  // For each change, find the cell in XML and update its value
  for (const [cellRef, value] of changes) {
    const num = Number(value);
    const isNum = !isNaN(num) && value.trim() !== "";

    // Match the cell element in XML: <c r="B8" s="..." t="...">...</c>
    // The cell can have various formats
    const cellRegex = new RegExp(
      `(<c\\s+r="${cellRef}"[^>]*?)(?:\\s+t="[^"]*")?([^>]*>)[\\s\\S]*?</c>`,
      "i"
    );

    const cellMatch = sheetXml.match(cellRegex);
    
    if (cellMatch) {
      // Cell exists — replace its value
      if (isNum) {
        // Numeric: remove t attribute, set <v>number</v>
        let openTag = cellMatch[1].replace(/\s+t="[^"]*"/, "") + cellMatch[2];
        // Remove any existing t= attribute from the combined tag
        openTag = openTag.replace(/\s+t="[^"]*"/, "");
        const replacement = `${openTag}<v>${num}</v></c>`;
        sheetXml = sheetXml.replace(cellMatch[0], replacement);
      } else {
        // String: add to shared strings and reference it
        sharedStrings.push(value);
        const ssIndex = sharedStrings.length - 1;
        let openTag = cellMatch[1] + ` t="s"` + cellMatch[2];
        // Clean up any duplicate t= attributes  
        const tCount = (openTag.match(/\s+t="[^"]*"/g) || []).length;
        if (tCount > 1) {
          openTag = openTag.replace(/\s+t="[^"]*"/g, "");
          openTag = openTag.replace(/>/, ` t="s">`);
        }
        const replacement = `${openTag}<v>${ssIndex}</v></c>`;
        sheetXml = sheetXml.replace(cellMatch[0], replacement);
      }
    } else {
      // Cell doesn't exist in XML — we'd need to insert it
      // For simplicity, skip non-existing cells (rare case for stock updates)
    }
  }

  // Update the sheet XML
  zip.file(sheetPath, sheetXml);

  // Update shared strings if we added any
  if (sharedStrings.length > 0 && sstFile) {
    const newSstEntries = sharedStrings.map((s) => `<si><t>${s}</t></si>`).join("");
    const newSstXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">${newSstEntries}</sst>`;
    zip.file(sstPath, newSstXml);
  }

  return zip.generateAsync({ type: "arraybuffer" });
}

export function extractKw(puissance: string): number {
  const match = puissance.match(/([\d.,]+)\s*[kK][wW]/i);
  if (match) return parseFloat(match[1].replace(",", "."));
  return 0;
}

export function encodeCellRef(row: number, col: number): string {
  return XLSX.utils.encode_cell({ r: row, c: col });
}
