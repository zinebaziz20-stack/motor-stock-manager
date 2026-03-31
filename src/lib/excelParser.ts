import * as XLSX from "xlsx";
import JSZip from "jszip";

// ---- Types ----

export type MotorCategory = "fonte" | "aluminium" | "bride_dm" | "bride_omt4" | "extra_dm1" | "extra_omt2" | "reserve" | "reparer";

export interface MotorEntry {
  id: string;
  category: MotorCategory;
  speed: number;
  puissance: string;
  supplier: string;
  quantity: string;
  rawRow: number;
  rawCol: number;
  // Extra fields for reserved motors
  date?: string;
  commercial?: string;
  societe?: string;
  produit?: string;
  serie?: string;
  bc?: string;
  // Extra for special tables
  taille?: string;
  description?: string;
}

export interface ParsedStock {
  motors: MotorEntry[];
  workbook: XLSX.WorkBook;
  originalData: ArrayBuffer;
}

function clean(val: unknown): string {
  if (val === undefined || val === null || val === "") return "";
  return String(val).trim();
}

export function parseStockExcel(data: ArrayBuffer): ParsedStock {
  const workbook = XLSX.read(data, { type: "array", cellStyles: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  const motors: MotorEntry[] = [];
  let id = 0;

  // ===== 1) FONTE: 3000 / 1500 / 1000 / 750 =====
  const fonteConfigs = [
    { speed: 3000, pCol: 0, sups: [{ c: 1, n: "OMT3" }, { c: 2, n: "OMT1" }, { c: 3, n: "DM" }], r0: 7, r1: 34 },
    { speed: 1500, pCol: 5, sups: [{ c: 6, n: "OMT3" }, { c: 7, n: "OMT1" }, { c: 8, n: "DM" }], r0: 7, r1: 37 },
    { speed: 1000, pCol: 10, sups: [{ c: 11, n: "DM1" }, { c: 12, n: "OMT1" }, { c: 13, n: "DM" }], r0: 7, r1: 28 },
    { speed: 750, pCol: 15, sups: [{ c: 16, n: "OMT1" }], r0: 7, r1: 20 },
  ];

  for (const cfg of fonteConfigs) {
    for (let r = cfg.r0; r <= Math.min(cfg.r1, raw.length - 1); r++) {
      const row = raw[r];
      if (!row) continue;
      const p = clean(row[cfg.pCol]);
      if (!p || !p.toLowerCase().includes("kw")) continue;
      for (const s of cfg.sups) {
        motors.push({ id: `f-${id++}`, category: "fonte", speed: cfg.speed, puissance: p, supplier: s.n, quantity: clean(row[s.c]), rawRow: r, rawCol: s.c });
      }
    }
  }

  // 1500 special voltages (rows 38-42, col F-G): 22Kw 220v, 5.5Kw 500V, etc.
  for (let r = 38; r <= Math.min(42, raw.length - 1); r++) {
    const row = raw[r];
    if (!row) continue;
    const p = clean(row[5]);
    if (!p || !p.toLowerCase().includes("kw")) continue;
    const qty = clean(row[6]);
    motors.push({ id: `f-${id++}`, category: "fonte", speed: 1500, puissance: p, supplier: "Spécial", quantity: qty, rawRow: r, rawCol: 6 });
  }

  // ===== 2) BRIDE DM (rows 29-42, cols P=15, Q=16, R=17) =====
  // Header at R29: "Bride DM | B5 | OMT3"
  for (let r = 29; r <= Math.min(42, raw.length - 1); r++) {
    const row = raw[r];
    if (!row) continue;
    const taille = clean(row[15]);
    if (!taille || isNaN(Number(taille))) continue; // taille is a number like 80,90...
    const b5 = clean(row[16]);
    const omt3 = clean(row[17]);
    if (b5) motors.push({ id: `bdm-${id++}`, category: "bride_dm", speed: 0, puissance: "", supplier: "B5", quantity: b5, rawRow: r, rawCol: 16, taille });
    if (omt3) motors.push({ id: `bdm-${id++}`, category: "bride_dm", speed: 0, puissance: "", supplier: "OMT3", quantity: omt3, rawRow: r, rawCol: 17, taille });
  }

  // ===== 3) Extra DM1 table (rows 32-34, cols K=10, L=11, M=12, N=13) =====
  // Header at R32: "Puissance | DM1 | Taille | Vitesse"
  for (let r = 32; r <= Math.min(34, raw.length - 1); r++) {
    const row = raw[r];
    if (!row) continue;
    const p = clean(row[10]);
    if (!p || !p.toLowerCase().includes("kw")) continue;
    const qty = clean(row[11]);
    const taille = clean(row[12]);
    const vitesse = clean(row[13]);
    motors.push({ id: `dm1-${id++}`, category: "extra_dm1", speed: Number(vitesse) || 0, puissance: p, supplier: "DM1", quantity: qty, rawRow: r, rawCol: 11, taille });
  }

  // ===== 4) Extra OMT2 table (rows 36-42, cols K=10, L=11, M=12, N=13) =====
  // Header at R36: "Puissance | OMT2 | Taille | Vitesse"
  for (let r = 36; r <= Math.min(42, raw.length - 1); r++) {
    const row = raw[r];
    if (!row) continue;
    const p = clean(row[10]);
    if (!p || !p.toLowerCase().includes("kw")) continue;
    const qty = clean(row[11]);
    const taille = clean(row[12]);
    const vitesse = clean(row[13]);
    motors.push({ id: `omt2-${id++}`, category: "extra_omt2", speed: Number(vitesse) || 0, puissance: p, supplier: "OMT2", quantity: qty, rawRow: r, rawCol: 11, taille });
  }

  // ===== 5) ALUMINIUM 1500 (rows 50-68, cols A-E) =====
  for (let r = 50; r <= Math.min(68, raw.length - 1); r++) {
    const row = raw[r];
    if (!row) continue;
    const p = clean(row[0]);
    if (!p || !p.toLowerCase().includes("kw")) continue;
    for (const s of [{ c: 1, n: "OMT4" }, { c: 2, n: "OMT2" }, { c: 3, n: "DMA" }, { c: 4, n: "DUTCH" }]) {
      motors.push({ id: `a15-${id++}`, category: "aluminium", speed: 1500, puissance: p, supplier: s.n, quantity: clean(row[s.c]), rawRow: r, rawCol: s.c });
    }
  }

  // ===== 6) ALUMINIUM 3000 (rows 50-65, cols K=10, L=11, M=12, N=13) =====
  for (let r = 50; r <= Math.min(65, raw.length - 1); r++) {
    const row = raw[r];
    if (!row) continue;
    const p = clean(row[10]);
    if (!p || !p.toLowerCase().includes("kw")) continue;
    for (const s of [{ c: 11, n: "DMA2" }, { c: 12, n: "OMT2" }, { c: 13, n: "DUTCH" }]) {
      motors.push({ id: `a30-${id++}`, category: "aluminium", speed: 3000, puissance: p, supplier: s.n, quantity: clean(row[s.c]), rawRow: r, rawCol: s.c });
    }
  }

  // ===== 7) BRIDE OMT4 (rows 107-113, cols P=15, Q=16, R=17) =====
  for (let r = 107; r <= Math.min(113, raw.length - 1); r++) {
    const row = raw[r];
    if (!row) continue;
    const taille = clean(row[15]);
    if (!taille || isNaN(Number(taille))) continue;
    const b5 = clean(row[16]);
    const b14 = clean(row[17]);
    if (b5) motors.push({ id: `bo4-${id++}`, category: "bride_omt4", speed: 0, puissance: "", supplier: "B5", quantity: b5, rawRow: r, rawCol: 16, taille });
    if (b14) motors.push({ id: `bo4-${id++}`, category: "bride_omt4", speed: 0, puissance: "", supplier: "B14", quantity: b14, rawRow: r, rawCol: 17, taille });
  }

  // ===== 8) MOTEURS RÉSERVÉS (rows 89+) =====
  // Header R89: Date | Comerciel | SOCIETE | | Produit | | | SERIE | Qté | BC
  let currentCommercial = "";
  for (let r = 89; r <= Math.min(104, raw.length - 1); r++) {
    const row = raw[r];
    if (!row) continue;
    const comm = clean(row[1]);
    if (comm && !clean(row[4])) { currentCommercial = comm; continue; }
    const produit = clean(row[4]);
    if (!produit) continue;
    const qty = clean(row[8]);
    const serie = clean(row[7]);
    const date = clean(row[0]);
    const societe = clean(row[2]);
    const bc = clean(row[9]);
    motors.push({
      id: `res-${id++}`, category: "reserve", speed: 0, puissance: produit, supplier: serie || "—",
      quantity: qty, rawRow: r, rawCol: 8, commercial: currentCommercial || comm, date, societe, produit, serie, bc,
    });
  }

  // ===== 9) MOTEURS À RÉPARER (rows 106+) =====
  for (let r = 106; r <= Math.min(119, raw.length - 1); r++) {
    const row = raw[r];
    if (!row) continue;
    const desc = clean(row[1]);
    if (!desc || desc.toLowerCase().includes("moteurs") && desc.toLowerCase().includes("parer")) continue;
    if (!desc.toLowerCase().includes("kw") && !desc.toLowerCase().includes("dma")) continue;
    motors.push({
      id: `rep-${id++}`, category: "reparer", speed: 0, puissance: "", supplier: "",
      quantity: "", rawRow: r, rawCol: 1, description: desc,
    });
  }

  return { motors, workbook, originalData: data };
}

// ---- Utility functions ----

export function updateExcelCell(workbook: XLSX.WorkBook, row: number, col: number, value: string): void {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
  if (!sheet[cellRef]) {
    sheet[cellRef] = { t: "s", v: value };
  } else {
    const num = Number(value);
    if (!isNaN(num) && value !== "") {
      sheet[cellRef].t = "n";
      sheet[cellRef].v = num;
    } else {
      sheet[cellRef].t = "s";
      sheet[cellRef].v = value;
    }
  }
}

export async function exportWorkbook(originalData: ArrayBuffer, changes: Map<string, string>): Promise<ArrayBuffer> {
  if (changes.size === 0) return originalData;

  const zip = await JSZip.loadAsync(originalData);
  const sheetFile = zip.file("xl/worksheets/sheet1.xml");
  if (!sheetFile) return originalData;

  let sheetXml = await sheetFile.async("string");
  const sstFile = zip.file("xl/sharedStrings.xml");
  let sharedStrings: string[] = [];

  if (sstFile) {
    const sstXml = await sstFile.async("string");
    const siMatches = sstXml.match(/<si>([\s\S]*?)<\/si>/g);
    if (siMatches) {
      sharedStrings = siMatches.map((si) => {
        const tMatch = si.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        return tMatch ? tMatch[1] : "";
      });
    }
  }

  for (const [cellRef, value] of changes) {
    const num = Number(value);
    const isNum = !isNaN(num) && value.trim() !== "";
    const cellRegex = new RegExp(`(<c\\s+r="${cellRef}"[^>]*?)(?:\\s+t="[^"]*")?([^>]*>)[\\s\\S]*?</c>`, "i");
    const cellMatch = sheetXml.match(cellRegex);

    if (cellMatch) {
      if (isNum) {
        let openTag = (cellMatch[1] + cellMatch[2]).replace(/\s+t="[^"]*"/g, "");
        sheetXml = sheetXml.replace(cellMatch[0], `${openTag}<v>${num}</v></c>`);
      } else {
        sharedStrings.push(value);
        const ssIndex = sharedStrings.length - 1;
        let openTag = (cellMatch[1] + cellMatch[2]).replace(/\s+t="[^"]*"/g, "").replace(/>/, ` t="s">`);
        sheetXml = sheetXml.replace(cellMatch[0], `${openTag}<v>${ssIndex}</v></c>`);
      }
    }
  }

  zip.file("xl/worksheets/sheet1.xml", sheetXml);

  if (sharedStrings.length > 0 && sstFile) {
    const entries = sharedStrings.map((s) => `<si><t>${s}</t></si>`).join("");
    zip.file("xl/sharedStrings.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">${entries}</sst>`
    );
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

export const CATEGORY_LABELS: Record<MotorCategory, string> = {
  fonte: "Fonte",
  aluminium: "Aluminium",
  bride_dm: "Bride DM",
  bride_omt4: "Bride OMT4",
  extra_dm1: "DM1 (Extra)",
  extra_omt2: "OMT2 (Extra)",
  reserve: "Réservé",
  reparer: "À réparer",
};
