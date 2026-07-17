import "server-only";
import ExcelJS from "exceljs";
import { FACT_COLUMNS, LOC_COLUMNS } from "@/lib/factMonthly";
import { PERSON_COLUMNS, AAI_DOMAIN_LABEL } from "@/lib/factPersons";
import { colRangeText, type QCol } from "@/lib/questionnaire/columns";
import { parseCsv } from "@/lib/csv";
import type { ProjectLocation } from "@/types";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern", pattern: "solid", fgColor: { argb: "FF1A56DB" },
};
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, name: "Tahoma", size: 11 };

function headerRow(ws: ExcelJS.Worksheet, labels: string[]) {
  const row = ws.addRow(labels);
  row.eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = HEADER_FONT;
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  row.height = 32;
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

/** README/คำอธิบาย sheet — documents every column ↔ original FactMonthlyMonitor field. */
function addReadme(wb: ExcelJS.Workbook, projectName: string, kind: "submissions" | "locations") {
  const ws = wb.addWorksheet("คำอธิบาย");
  ws.addRow([`แบบฟอร์ม NEDP — ${projectName}`]).font = { bold: true, size: 13, name: "Tahoma" };
  ws.addRow([
    kind === "submissions"
      ? "กรอกค่าของแต่ละพื้นที่ในชีต “ข้อมูลรายเดือน” แล้วอัปโหลดไฟล์กลับเข้าระบบ"
      : "แก้ไขรายชื่อพื้นที่ในชีต “รายชื่อพื้นที่” แล้วอัปโหลดไฟล์กลับเข้าระบบ",
  ]);
  ws.addRow(["• เดือน/รหัสโครงการ/ชื่อโครงการ ระบบเติมให้อัตโนมัติ — ไม่ต้องกรอกในไฟล์"]);
  ws.addRow(["• ระบบจับคู่พื้นที่ด้วย จังหวัด + อำเภอ + ตำบล (ไม่ใช้รหัส id)"]);
  if (kind === "locations") {
    ws.addRow(["• การเปลี่ยนชื่อพื้นที่ที่ “ส่งข้อมูลแล้ว” ให้แก้ในหน้าจัดการทีละพื้นที่ เพื่อคงประวัติการส่ง"]);
  }
  ws.addRow([]);
  headerRow(ws, ["คอลัมน์ (ไทย)", "ฟิลด์ต้นทาง (Power BI)", "คำอธิบาย"]);
  const cols = kind === "submissions" ? [...LOC_COLUMNS, ...FACT_COLUMNS] : [...LOC_COLUMNS];
  for (const c of cols) {
    ws.addRow([c.th, c.src, "help" in c ? c.help : "พื้นที่ลงพื้นที่"]);
  }
  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 28;
  ws.getColumn(3).width = 40;
}

async function toBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Monthly-report data template: FactMonthlyMonitor columns (minus the 3 auto-derived ones),
 *  Thai headers, one prefilled row per project location. No id column. */
export async function buildSubmissionsWorkbook(
  projectName: string,
  locations: ProjectLocation[],
  latestData?: Map<string, Record<string, string>>,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("ข้อมูลรายเดือน");
  headerRow(ws, [...LOC_COLUMNS.map((c) => c.th), ...FACT_COLUMNS.map((c) => c.th)]);
  for (const l of locations) {
    const prev = latestData?.get(l.id);
    ws.addRow([l.province, l.amphoe, l.tambon, ...FACT_COLUMNS.map((c) => prev?.[c.key] ?? "")]);
  }
  LOC_COLUMNS.forEach((_c, i) => { ws.getColumn(i + 1).width = 18; });
  FACT_COLUMNS.forEach((c, i) => { ws.getColumn(LOC_COLUMNS.length + i + 1).width = c.kind === "text" ? 28 : 16; });
  addReadme(wb, projectName, "submissions");
  return toBuffer(wb);
}

/** Locations template: จังหวัด/อำเภอ/ตำบล only (no id), prefilled with the current list. */
export async function buildLocationsWorkbook(projectName: string, locations: ProjectLocation[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("รายชื่อพื้นที่");
  headerRow(ws, LOC_COLUMNS.map((c) => c.th));
  for (const l of locations) ws.addRow([l.province, l.amphoe, l.tambon]);
  LOC_COLUMNS.forEach((_c, i) => { ws.getColumn(i + 1).width = 22; });
  addReadme(wb, projectName, "locations");
  return toBuffer(wb);
}

/** Data-dictionary sheet for the persons template — every column ↔ range/code ↔ AAI indicator ↔ help,
 *  plus a PDPA banner (this template carries real names). */
function addPersonsReadme(wb: ExcelJS.Workbook, projectName: string) {
  const ws = wb.addWorksheet("คำอธิบาย");
  ws.addRow([`แบบฟอร์มข้อมูลรายบุคคล NEDP — ${projectName}`]).font = { bold: true, size: 13, name: "Tahoma" };
  ws.addRow(["กรอกข้อมูล 1 แถวต่อผู้สูงอายุ 1 คน ในชีต “ข้อมูลรายบุคคล” แล้วอัปโหลดไฟล์กลับเข้าระบบ"]);
  ws.addRow(["⚠ ไฟล์นี้มีชื่อ–สกุลจริง (ข้อมูลส่วนบุคคล) — จัดเก็บ/ส่งอย่างปลอดภัย และต้องได้รับความยินยอมตาม PDPA ก่อนบันทึก"])
    .font = { bold: true, color: { argb: "FFB91C1C" }, name: "Tahoma" };
  ws.addRow(["• เว้นช่องที่ไม่มีข้อมูลไว้ว่าง (ระบบถือว่า “ไม่มีข้อมูล” ไม่ใช่ 0)"]);
  ws.addRow(["• จังหวัด/อำเภอ/ตำบล ต้องตรงกับพื้นที่ดำเนินการของโครงการ"]);
  ws.addRow(["• ระบบคำนวณคะแนน AAI (D1–D4) ให้อัตโนมัติจากคำตอบ — ไม่ต้องกรอกคะแนน AAI เอง"]);
  ws.addRow(["• ★ = ข้อคำถามใหม่ที่เพิ่มเพื่อคำนวณ AAI ให้ครบถ้วน (อยู่ระหว่างการรับรองของคณะกรรมการ)"]);
  ws.addRow([]);
  headerRow(ws, ["คอลัมน์ (ไทย)", "ช่วงค่า / รหัส", "ตัวชี้วัด AAI (มิติ)", "คำอธิบาย"]);
  for (const c of PERSON_COLUMNS) {
    const range = c.enumMap
      ? [...new Set(Object.keys(c.enumMap))].join(" / ")
      : c.min != null && c.max != null ? `${c.min}–${c.max}` : "";
    const ind = c.indicator ? `${c.indicator}${c.domain ? ` (${AAI_DOMAIN_LABEL[c.domain]})` : ""}` : "";
    ws.addRow([c.th, range, ind, c.help]);
  }
  ws.getColumn(1).width = 42;
  ws.getColumn(2).width = 26;
  ws.getColumn(3).width = 34;
  ws.getColumn(4).width = 64;
}

/** Per-person questionnaire intake template: one row per elderly person → the platform derives the AAI.
 *  Seeded with one blank row per project tambon (จังหวัด/อำเภอ/ตำบล prefilled) as a starting point. */
export async function buildPersonsWorkbook(
  projectName: string, locations: { province: string; amphoe: string; tambon: string }[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("ข้อมูลรายบุคคล");
  headerRow(ws, PERSON_COLUMNS.map((c) => c.th));
  const idx = (k: string) => PERSON_COLUMNS.findIndex((c) => c.key === k);
  const iProv = idx("province"), iAmp = idx("amphoe"), iTam = idx("tambon");
  for (const l of locations) {
    const row = PERSON_COLUMNS.map(() => "");
    row[iProv] = l.province; row[iAmp] = l.amphoe; row[iTam] = l.tambon;
    ws.addRow(row);
  }
  PERSON_COLUMNS.forEach((c, i) => { ws.getColumn(i + 1).width = c.key === "full_name" ? 22 : c.th.length > 26 ? 26 : 15; });
  addPersonsReadme(wb, projectName);
  return toBuffer(wb);
}

/** Data-dictionary sheet for a per-project questionnaire template. */
function addQuestionnaireReadme(wb: ExcelJS.Workbook, projectName: string, cols: QCol[]) {
  const ws = wb.addWorksheet("คำอธิบาย");
  ws.addRow([`แบบสอบถามรายบุคคล NEDP — ${projectName}`]).font = { bold: true, size: 13, name: "Tahoma" };
  ws.addRow(["กรอกข้อมูล 1 แถวต่อผู้สูงอายุ 1 คน ในชีต “ข้อมูลแบบสอบถาม” แล้วอัปโหลดไฟล์กลับเข้าระบบ"]);
  ws.addRow(["⚠ ไฟล์นี้มีชื่อ–สกุลจริง (ข้อมูลส่วนบุคคล) — จัดเก็บ/ส่งอย่างปลอดภัย และต้องได้รับความยินยอมตาม PDPA"])
    .font = { bold: true, color: { argb: "FFB91C1C" }, name: "Tahoma" };
  ws.addRow(["• ข้อแบบเลือก: ใส่ตัวเลขค่า หรือข้อความตัวเลือกก็ได้ · เว้นว่างเมื่อไม่มีข้อมูล (ไม่ใช่ 0)"]);
  ws.addRow(["• ระบบคำนวณคะแนนเครื่องมือคลินิก + ระดับความเสี่ยง + คะแนน AAI ให้อัตโนมัติ"]);
  ws.addRow([]);
  headerRow(ws, ["คอลัมน์ (ไทย)", "ค่าที่รับ", "หมายเหตุ"]);
  for (const c of cols) ws.addRow([c.th, colRangeText(c), c.help ?? ""]);
  ws.getColumn(1).width = 54;
  ws.getColumn(2).width = 30;
  ws.getColumn(3).width = 44;
}

/** Per-project questionnaire template: one row per person, columns = the assignment's schema (identity +
 *  the modules' questions), seeded with one blank row per project tambon. */
export async function buildQuestionnaireWorkbook(
  projectName: string, cols: QCol[], locations: { province: string; amphoe: string; tambon: string }[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("ข้อมูลแบบสอบถาม");
  headerRow(ws, cols.map((c) => c.th));
  const idx = (k: string) => cols.findIndex((c) => c.key === k);
  const iProv = idx("province"), iAmp = idx("amphoe"), iTam = idx("tambon");
  for (const l of locations) {
    const row = cols.map(() => "");
    if (iProv >= 0) row[iProv] = l.province;
    if (iAmp >= 0) row[iAmp] = l.amphoe;
    if (iTam >= 0) row[iTam] = l.tambon;
    ws.addRow(row);
  }
  cols.forEach((c, i) => { ws.getColumn(i + 1).width = c.kind === "identity" ? 18 : 14; });
  addQuestionnaireReadme(wb, projectName, cols);
  return toBuffer(wb);
}

/** Raw-data export: every assessment / อสม. / monthly-report / roster row as a multi-sheet workbook.
 *  Codes only — person_code is the identity; decrypted names are never written to the file. */
export async function buildRawExportWorkbook(
  x: import("@/lib/data/sb/export").RawExport,
  opts: { multiProject: boolean },
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const P = opts.multiProject ? ["โครงการ"] : []; // prepended project column for the all-projects export
  const pv = (name: string) => (opts.multiProject ? [name] : []);
  const flag = (b: boolean) => (b ? "✓" : "");
  const setWidths = (ws: ExcelJS.Worksheet, widths: number[]) =>
    widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const wsA = wb.addWorksheet("รายบุคคล AAI");
  headerRow(wsA, [...P, "รหัสผู้เข้าร่วม", "ตำบล", "เดือน", "D1", "D2", "D3", "D4", "คะแนนรวม", "ครั้งแรก", "ล่าสุด", "สถานะ"]);
  for (const r of x.assessments) {
    wsA.addRow([...pv(r.projectName), r.personCode, r.tambonTh, r.yearMonth,
      r.d1 ?? "", r.d2 ?? "", r.d3 ?? "", r.d4 ?? "", r.overall ?? "",
      flag(r.isBaseline), flag(r.isLatest), r.status]);
  }
  setWidths(wsA, [...P.map(() => 26), 18, 16, 12, 8, 8, 8, 8, 12, 9, 9, 12]);

  const wsO = wb.addWorksheet("อสม.");
  headerRow(wsO, [...P, "ตำบล", "เดือน", "อสม. ก่อน", "อสม. หลัง"]);
  for (const r of x.osm) wsO.addRow([...pv(r.projectName), r.tambonTh, r.yearMonth, r.osmBefore ?? "", r.osmAfter ?? ""]);
  setWidths(wsO, [...P.map(() => 26), 16, 12, 12, 12]);

  const wsS = wb.addWorksheet("รายงานรายพื้นที่");
  headerRow(wsS, [...P, ...LOC_COLUMNS.map((c) => c.th), "เดือน", ...FACT_COLUMNS.map((c) => c.th), "ส่งเมื่อ"]);
  for (const r of x.submissions) {
    wsS.addRow([...pv(r.projectName), r.province, r.amphoe, r.tambon, r.yearMonth,
      ...FACT_COLUMNS.map((c) => r.values[c.key] ?? ""),
      r.submittedAt ? r.submittedAt.slice(0, 10) : ""]);
  }
  setWidths(wsS, [...P.map(() => 26), 16, 16, 16, 12, ...FACT_COLUMNS.map((c) => (c.kind === "text" ? 28 : 14)), 12]);

  const wsR = wb.addWorksheet("ผู้เข้าร่วม");
  headerRow(wsR, [...P, "รหัสผู้เข้าร่วม", "ตำบล", "เพศ", "ช่วงอายุ", "วันที่ลงทะเบียน"]);
  for (const r of x.roster) {
    wsR.addRow([...pv(r.projectName), r.personCode, r.tambonTh, r.sex ?? "", r.ageBand ?? "",
      r.enrolledAt ? r.enrolledAt.slice(0, 10) : ""]);
  }
  setWidths(wsR, [...P.map(() => 26), 18, 16, 8, 10, 14]);

  // Questionnaire answers (custom per-project questions) — one row per person×month×round.
  if (x.qAnswerCols.length && x.qAnswers.length) {
    const wsQ = wb.addWorksheet("แบบสอบถาม (คำตอบ)");
    headerRow(wsQ, [...P, "รหัสผู้เข้าร่วม", "ตำบล", "เดือน", "รอบ", ...x.qAnswerCols.map((c) => c.th)]);
    for (const r of x.qAnswers) {
      wsQ.addRow([...pv(r.projectName), r.personCode, r.tambonTh, r.yearMonth, r.round,
        ...x.qAnswerCols.map((c) => r.answers[c.key] ?? "")]);
    }
    setWidths(wsQ, [...P.map(() => 26), 18, 16, 12, 8, ...x.qAnswerCols.map(() => 16)]);
  }

  // Computed scores (AAI tools + declared คะแนนเฉพาะโครงการ) — one row per person×month×round.
  if (x.qScoreCols.length && x.qScores.length) {
    const wsSc = wb.addWorksheet("คะแนนเฉพาะโครงการ");
    headerRow(wsSc, [...P, "รหัสผู้เข้าร่วม", "ตำบล", "เดือน", "รอบ", ...x.qScoreCols.map((c) => c.th)]);
    for (const r of x.qScores) {
      wsSc.addRow([...pv(r.projectName), r.personCode, r.tambonTh, r.yearMonth, r.round,
        ...x.qScoreCols.map((c) => r.scores[c.key] ?? "")]);
    }
    setWidths(wsSc, [...P.map(() => 26), 18, 16, 12, 8, ...x.qScoreCols.map(() => 14)]);
  }

  const ws = wb.addWorksheet("คำอธิบาย");
  ws.addRow([`ข้อมูลดิบ NEDP — ${x.projectLabel} — ${x.monthLabel === "ทั้งหมด" ? "ทุกเดือน" : `เดือน ${x.monthLabel}`}`])
    .font = { bold: true, size: 13, name: "Tahoma" };
  ws.addRow(["• ไฟล์นี้ใช้รหัสผู้เข้าร่วมแทนตัวบุคคล — ไม่มีชื่อ–สกุลจริง (นโยบายคุ้มครองข้อมูลส่วนบุคคล)"]);
  ws.addRow(["• “รายบุคคล AAI”: คะแนน 4 มิติราย เดือน×คน · ครั้งแรก = คะแนนตั้งต้น (baseline) · ล่าสุด = ครั้งล่าสุด"]);
  ws.addRow(["• “อสม.”: จำนวน อสม. ที่ผ่านการอบรม ก่อน/หลัง ราย ตำบล×เดือน"]);
  ws.addRow(["• “รายงานรายพื้นที่”: รายงานตัวชี้วัดรายเดือนแบบรายพื้นที่ (ระบบเดิม) เฉพาะที่ส่งแล้ว"]);
  ws.addRow(["• “ผู้เข้าร่วม”: ทะเบียนผู้สูงอายุ (รหัส · ตำบล · เพศ · ช่วงอายุ)"]);
  if (x.qAnswerCols.length) ws.addRow(["• “แบบสอบถาม (คำตอบ)”: คำตอบรายข้อของแบบสอบถามเฉพาะโครงการ ราย เดือน×รอบ×คน"]);
  if (x.qScoreCols.length) ws.addRow(["• “คะแนนเฉพาะโครงการ”: คะแนนที่ระบบคำนวณ (เครื่องมือ AAI + คะแนนเฉพาะที่โครงการกำหนด) ราย เดือน×รอบ×คน"]);
  ws.getColumn(1).width = 100;

  return toBuffer(wb);
}

/** Admin aggregate export: ONE ROW PER PROJECT — submission progress + the project-level Overall + D1–D4.
 *  Deliberately NO per-person rows, roster, raw questionnaire answers, or indicator columns (admin gets the
 *  standardized project-level summary only). */
export async function buildAdminSummaryWorkbook(
  rows: import("@/lib/data/sb/dashboard").AdminProjectSummary[], monthLabel: string,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("สรุปรายโครงการ");
  headerRow(ws, ["โครงการ", "ผู้รับผิดชอบ", "ความคืบหน้า", "พื้นที่ส่งแล้ว", "ผู้สูงอายุ", "AAI รวม", "D1", "D2", "D3", "D4"]);
  for (const r of rows) {
    ws.addRow([
      r.projectName, r.researcher, `${r.completionPct}%`, `${r.locationsDone}/${r.locationsTotal}`,
      r.nElderly, r.overall ?? "", r.d1 ?? "", r.d2 ?? "", r.d3 ?? "", r.d4 ?? "",
    ]);
  }
  [40, 24, 12, 14, 12, 10, 8, 8, 8, 8].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const note = wb.addWorksheet("คำอธิบาย");
  note.addRow([`สรุป AAI รายโครงการ NEDP — ${monthLabel === "ทั้งหมด" || monthLabel === "ล่าสุด" ? "ล่าสุด" : `เดือน ${monthLabel}`}`])
    .font = { bold: true, size: 13, name: "Tahoma" };
  note.addRow(["• หนึ่งแถวต่อหนึ่งโครงการ — ความคืบหน้าการส่งข้อมูล + คะแนน AAI ภาพรวม (Overall + 4 มิติ D1–D4)"]);
  note.addRow(["• คะแนน AAI ถ่วงน้ำหนักตามจำนวนผู้สูงอายุในแต่ละพื้นที่ · พื้นที่ที่มีผู้สูงอายุ < 5 คน จะถูกปกปิด (ไม่นับ)"]);
  note.addRow(["• ไม่มีข้อมูลรายบุคคล คำตอบรายข้อ หรือค่าตัวชี้วัดในไฟล์นี้ (สรุประดับโครงการเท่านั้น)"]);
  note.getColumn(1).width = 96;

  return toBuffer(wb);
}

function cellToStr(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "object") {
    if ("error" in v) return ""; // formula error cell (#REF!, #DIV/0!, …) → blank, never store "[object …]"
    if ("text" in v && typeof v.text === "string") return v.text;
    if ("result" in v) return String((v as { result: unknown }).result ?? "");
    if ("richText" in v) return (v as { richText: { text: string }[] }).richText.map((t) => t.text).join("");
    return "";
  }
  return String(v);
}

/** Parse an uploaded .xlsx (first sheet) or .csv into { header, rows } of trimmed strings. */
export async function parseSheet(buf: ArrayBuffer, filename: string): Promise<{ header: string[]; rows: string[][] }> {
  let grid: string[][];
  if (/\.xlsx$/i.test(filename)) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    grid = [];
    ws?.eachRow((row) => {
      const vals = (row.values as ExcelJS.CellValue[]).slice(1); // exceljs is 1-indexed
      grid.push(vals.map((c) => cellToStr(c).trim()));
    });
  } else {
    grid = parseCsv(new TextDecoder("utf-8").decode(buf)).map((r) => r.map((c) => (c ?? "").trim()));
  }
  const nonEmpty = grid.filter((r) => r.some((c) => c !== ""));
  if (nonEmpty.length === 0) return { header: [], rows: [] };
  return { header: nonEmpty[0], rows: nonEmpty.slice(1) };
}
