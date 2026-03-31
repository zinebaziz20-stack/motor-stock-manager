import * as XLSX from "xlsx";

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

export function exportWorkbook(workbook: XLSX.WorkBook): ArrayBuffer {
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" });
}

export function extractKw(puissance: string): number {
  const match = puissance.match(/([\d.,]+)\s*[kK][wW]/i);
  if (match) return parseFloat(match[1].replace(",", "."));
  return 0;
}
