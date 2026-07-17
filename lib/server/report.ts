import "server-only";
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, ShadingType,
  Table, TableRow, TableCell, WidthType, Footer, PageNumber, VerticalAlign,
} from "docx";
import { getProject, getLocations, getLatestSubmissionData, getMyProjects, getLeaderboard, getProjectQuestionnaireSummary } from "@/lib/data";
import type { QuestionnaireSummaryRow } from "@/lib/data";
import { METRIC_GROUPS } from "@/lib/factMonthly";
import { monthLabelThai } from "@/lib/format";

const FONT = "Sarabun";
// Palette (Thai-government formal): brand blue + slate ink + light rules.
const BRAND = "1A56DB", INK = "0F172A", MUTED = "64748B", LINE = "CBD5E1", ZEBRA = "F1F5F9", KFILL = "EFF4FF";

/** Indicator groups for the report — a หลัง-only metric (e.g. "AAI เพิ่ม 10%") shows ก่อน = "—". */
const GROUPS = METRIC_GROUPS.map((g) => ({ label: g.label, unit: g.unit, before: g.before, after: g.after }));
const DIMS = [
  ["aai_d1", "ด้านการมีงานทำ/รายได้"], ["aai_d2", "ด้านการมีส่วนร่วม"],
  ["aai_d3", "ด้านสุขภาพและความมั่นคง"], ["aai_d4", "ด้านสภาพแวดล้อม"],
] as const;
const STATUS_TH: Record<string, string> = {
  submitted: "ส่งแล้ว", draft: "ร่าง", not_started: "ยังไม่ส่ง", approved: "อนุมัติแล้ว", rejected: "ตีกลับ",
};

export interface ReportData {
  projectName: string; org: string; researcher: string; monthLabel: string; generatedAt: string;
  total: number; done: number; points: number; status: string; rank?: number;
  dims: { label: string; before: number | null; after: number | null }[];
  rows: { tambon: string; amphoe: string; province: string; values: Record<string, string> }[];
  /** Assigned-questionnaire summary (Part F2): per-tool/specific-score mean over each person's latest. */
  qSummary: QuestionnaireSummaryRow[]; qPersons: number;
}

const num = (v: unknown) => { const n = Number(String(v ?? "").trim()); return String(v ?? "").trim() !== "" && Number.isFinite(n) ? n : null; };
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
const fmtNum = (n: number | null) => (n == null ? "—" : String(n));
const deltaVal = (b: number | null, a: number | null) => (b == null || a == null ? null : Math.round((a - b) * 10) / 10);
const fmtDelta = (b: number | null, a: number | null) => { const d = deltaVal(b, a); return d == null ? "—" : d > 0 ? `+${d}` : `${d}`; };

export async function assembleReport(projectId: string, month: string): Promise<ReportData | null> {
  const [project, locations, latest, mine, board, qSum] = await Promise.all([
    getProject(projectId), getLocations(projectId), getLatestSubmissionData(projectId, month),
    getMyProjects(month), getLeaderboard(month), getProjectQuestionnaireSummary(projectId),
  ]);
  if (!project) return null;
  const myStat = mine.find((m) => m.project.id === projectId);
  const rank = board.find((s) => s.project.id === projectId)?.rank;
  const rows = locations.map((l) => ({ tambon: l.tambon, amphoe: l.amphoe, province: l.province, values: latest.get(l.id) ?? {} }));
  const dims = DIMS.map(([key, label]) => ({
    label,
    before: avg(rows.map((r) => num(r.values[`${key}_before`])).filter((n): n is number => n != null)),
    after: avg(rows.map((r) => num(r.values[`${key}_after`])).filter((n): n is number => n != null)),
  }));
  return {
    projectName: project.name, org: project.org ?? "", researcher: project.researcher ?? "",
    monthLabel: monthLabelThai(month), generatedAt: new Date().toLocaleDateString("th-TH"),
    total: locations.length,
    done: myStat?.locationsDone ?? rows.filter((r) => Object.keys(r.values).length > 0).length,
    points: myStat?.points ?? 0, status: STATUS_TH[myStat?.status ?? "not_started"] ?? "—", rank,
    dims, rows, qSummary: qSum.rows, qPersons: qSum.nPersons,
  };
}

function metaPairs(d: ReportData): [string, string][] {
  return [
    ["โครงการ", d.projectName],
    ["หน่วยงานรับผิดชอบ", d.org || "—"],
    ["ผู้รับผิดชอบโครงการ", d.researcher || "—"],
    ["รอบรายงานประจำเดือน", d.monthLabel],
    ["พื้นที่ดำเนินการ", `${d.done}/${d.total} พื้นที่ (ตำบล)`],
    ["สถานะการส่งข้อมูล", d.status],
    ["คะแนนสะสม", `${d.points}${d.rank ? `   ·   อันดับที่ ${d.rank}` : ""}`],
  ];
}

// ── DOCX ─────────────────────────────────────────────────────────────────────
const runT = (text: string, o: { size?: number; bold?: boolean; color?: string } = {}) =>
  new TextRun({ text, font: FONT, size: o.size ?? 21, bold: o.bold, color: o.color ?? INK });
const B = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const TBL_BORDERS = { top: B, bottom: B, left: B, right: B, insideHorizontal: B, insideVertical: B };
const dDocxColor = (b: number | null, a: number | null) => { const d = deltaVal(b, a); return d == null ? MUTED : d > 0 ? "15803D" : d < 0 ? "B91C1C" : INK; };

function td(text: string, o: { w?: number; bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; fill?: string; color?: string } = {}) {
  return new TableCell({
    width: o.w ? { size: o.w, type: WidthType.PERCENTAGE } : undefined,
    shading: o.fill ? { type: ShadingType.CLEAR, color: "auto", fill: o.fill } : undefined,
    margins: { top: 40, bottom: 40, left: 96, right: 96 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: o.align, children: [runT(text, { bold: o.bold, color: o.color })] })],
  });
}
function headRow(labels: string[], fracs: number[], aligns?: ((typeof AlignmentType)[keyof typeof AlignmentType])[]) {
  return new TableRow({
    tableHeader: true,
    children: labels.map((t, i) => td(t, { w: fracs[i], bold: true, fill: BRAND, color: "FFFFFF", align: aligns?.[i] ?? (i ? AlignmentType.CENTER : AlignmentType.LEFT) })),
  });
}
function kvTable(pairs: [string, string][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, borders: TBL_BORDERS,
    rows: pairs.map(([k, v]) => new TableRow({ children: [td(k, { w: 30, bold: true, fill: KFILL }), td(v || "—", { w: 70 })] })),
  });
}
function aaiTable(dims: ReportData["dims"]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, borders: TBL_BORDERS,
    rows: [
      headRow(["มิติ AAI", "ก่อน", "หลัง", "เปลี่ยนแปลง"], [40, 20, 20, 20]),
      ...dims.map((d, i) => new TableRow({
        children: [
          td(d.label, { w: 40, fill: i % 2 ? ZEBRA : undefined }),
          td(fmtNum(d.before), { w: 20, align: AlignmentType.CENTER, fill: i % 2 ? ZEBRA : undefined }),
          td(fmtNum(d.after), { w: 20, align: AlignmentType.CENTER, fill: i % 2 ? ZEBRA : undefined }),
          td(fmtDelta(d.before, d.after), { w: 20, align: AlignmentType.CENTER, fill: i % 2 ? ZEBRA : undefined, bold: true, color: dDocxColor(d.before, d.after) }),
        ],
      })),
    ],
  });
}
function metricTable(values: Record<string, string>) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, borders: TBL_BORDERS,
    rows: [
      headRow(["ตัวชี้วัด", "ก่อน", "หลัง"], [60, 20, 20]),
      ...GROUPS.map((g, i) => new TableRow({
        children: [
          td(`${g.label} (${g.unit})`, { w: 60, fill: i % 2 ? ZEBRA : undefined }),
          td(g.before ? (values[g.before] ?? "—") : "—", { w: 20, align: AlignmentType.CENTER, fill: i % 2 ? ZEBRA : undefined }),
          td(values[g.after] ?? "—", { w: 20, align: AlignmentType.CENTER, fill: i % 2 ? ZEBRA : undefined }),
        ],
      })),
    ],
  });
}
function qSummaryTable(rows: QuestionnaireSummaryRow[]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, borders: TBL_BORDERS,
    rows: [
      headRow(["เครื่องมือ / คะแนนเฉพาะ", "ค่าเฉลี่ย", "จำนวน (คน)", "ธงเตือน"], [46, 18, 18, 18]),
      ...rows.map((r, i) => new TableRow({
        children: [
          td(r.label, { w: 46, fill: i % 2 ? ZEBRA : undefined }),
          td(fmtNum(r.mean), { w: 18, align: AlignmentType.CENTER, fill: i % 2 ? ZEBRA : undefined }),
          td(String(r.n), { w: 18, align: AlignmentType.CENTER, fill: i % 2 ? ZEBRA : undefined }),
          td(r.flagged ? String(r.flagged) : "—", { w: 18, align: AlignmentType.CENTER, fill: i % 2 ? ZEBRA : undefined, bold: r.flagged > 0, color: r.flagged > 0 ? "B91C1C" : undefined }),
        ],
      })),
    ],
  });
}
function sectionH(text: string) {
  return new Paragraph({
    spacing: { before: 260, after: 130 },
    border: { left: { style: BorderStyle.SINGLE, size: 20, color: BRAND, space: 10 } },
    children: [runT(text, { bold: true, size: 25 })],
  });
}
function labeled(label: string, value?: string) {
  return new Paragraph({ spacing: { after: 50 }, children: [runT(`${label}:  `, { bold: true }), runT(value && value.trim() ? value : "—")] });
}

export async function buildReportDocx(d: ReportData): Promise<Buffer> {
  const perLocation = d.rows.flatMap((r, i) => {
    const has = Object.keys(r.values).length > 0;
    return [
      new Paragraph({
        spacing: { before: 180, after: 70 },
        children: [
          runT(`พื้นที่ที่ ${i + 1}:  `, { bold: true, size: 23, color: BRAND }),
          runT(`ตำบล${r.tambon}   อำเภอ${r.amphoe}   จังหวัด${r.province}`, { bold: true, size: 23 }),
        ],
      }),
      ...(has
        ? [metricTable(r.values), labeled("ปัญหา/อุปสรรค", r.values.issues), labeled("ข้อเสนอแนะ", r.values.recommendations), labeled("สถานะ", r.values.status)]
        : [new Paragraph({ children: [runT("(ยังไม่ส่งข้อมูล)", { color: MUTED })] })]),
    ];
  });

  const sig = (t: string) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 90 }, indent: { left: 5400 }, children: [runT(t)] });

  const children = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 30 }, children: [runT("ระบบฐานข้อมูลผู้สูงอายุแห่งชาติ (NEDP)  ·  โครงการมุ่งเป้าสูงวัย ปี 2568", { size: 18, color: MUTED })] }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 240 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BRAND, space: 8 } },
      children: [runT("รายงานการติดตามผลการดำเนินงานรายเดือน", { bold: true, size: 34, color: BRAND })],
    }),
    sectionH("ข้อมูลโครงการ"),
    kvTable(metaPairs(d)),
    sectionH("สรุปคะแนน AAI รายมิติ (ก่อน → หลัง)"),
    aaiTable(d.dims),
    ...(d.qSummary.length ? [sectionH(`สรุปแบบสอบถามเฉพาะโครงการ (${d.qPersons} คน)`), qSummaryTable(d.qSummary)] : []),
    sectionH("ผลการดำเนินงานรายพื้นที่ (ตำบล)"),
    ...perLocation,
    new Paragraph({ spacing: { before: 480 }, children: [runT("")] }),
    sig("ลงชื่อ ............................................................"),
    sig(`(  ${d.researcher || "............................................"}  )`),
    sig("ผู้รับผิดชอบโครงการ"),
    sig("วันที่ ........../........../.............."),
  ];

  const footer = new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        runT(`NEDP  ·  ${d.monthLabel}  ·  จัดทำเมื่อ ${d.generatedAt}      หน้า `, { size: 16, color: MUTED }),
        new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: MUTED }),
        runT(" / ", { size: 16, color: MUTED }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: MUTED }),
      ],
    })],
  });

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      footers: { default: footer },
      children,
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

// ── PDF (pdfkit + embedded Sarabun TTF for Thai) ──────────────────────────────
type PDFDoc = InstanceType<typeof PDFDocument>;

function pdfSection(doc: PDFDoc, text: string, W: number) {
  doc.moveDown(0.35);
  const x = doc.page.margins.left, y = doc.y;
  doc.save().rect(x, y + 1, 3, 14).fill(`#${BRAND}`).restore();
  doc.font("TH-B").fontSize(13).fillColor(`#${INK}`).text(text, x + 10, y, { width: W - 10 });
  doc.x = x;
  doc.moveDown(0.4);
}

function pdfKV(doc: PDFDoc, x: number, W: number, pairs: [string, string][], ensure: (h: number) => void) {
  const labW = W * 0.3, valW = W - labW, padX = 7, padY = 5;
  for (const [k, v] of pairs) {
    doc.font("TH-B").fontSize(10.5);
    const hk = doc.heightOfString(k, { width: labW - 2 * padX });
    doc.font("TH").fontSize(10.5);
    const hv = doc.heightOfString(v || "—", { width: valW - 2 * padX });
    const h = Math.max(hk, hv) + 2 * padY;
    ensure(h);
    const y = doc.y;
    doc.save().rect(x, y, labW, h).fill(`#${KFILL}`).restore();
    doc.save().lineWidth(0.5).strokeColor(`#${LINE}`).rect(x, y, W, h).stroke().moveTo(x + labW, y).lineTo(x + labW, y + h).stroke().restore();
    doc.font("TH-B").fontSize(10.5).fillColor(`#${INK}`).text(k, x + padX, y + padY, { width: labW - 2 * padX });
    doc.font("TH").fontSize(10.5).fillColor(`#${INK}`).text(v || "—", x + labW + padX, y + padY, { width: valW - 2 * padX });
    doc.y = y + h; doc.x = x;
  }
  doc.moveDown(0.5);
}

function pdfTable(
  doc: PDFDoc, x: number, W: number, fracs: number[], header: string[], rows: string[][],
  ensure: (h: number) => void, opts: { aligns?: ("left" | "center")[]; rowColors?: (string | undefined)[] } = {},
) {
  const cols = fracs.map((f) => f * W);
  const xs: number[] = []; let cx = x; for (const c of cols) { xs.push(cx); cx += c; }
  const padX = 7, padY = 5;
  const al = (i: number): "left" | "center" => opts.aligns?.[i] ?? (i === 0 ? "left" : "center");
  const drawRow = (cells: string[], o: { bold?: boolean; fill?: string; color?: string }) => {
    doc.font(o.bold ? "TH-B" : "TH").fontSize(10.5);
    let h = 0;
    cells.forEach((t, i) => { const hh = doc.heightOfString(String(t ?? ""), { width: cols[i] - 2 * padX, align: al(i) }); if (hh > h) h = hh; });
    h += 2 * padY;
    ensure(h);
    const y = doc.y;
    if (o.fill) doc.save().rect(x, y, W, h).fill(o.fill).restore();
    doc.font(o.bold ? "TH-B" : "TH").fontSize(10.5).fillColor(o.color ?? `#${INK}`);
    cells.forEach((t, i) => doc.text(String(t ?? ""), xs[i] + padX, y + padY, { width: cols[i] - 2 * padX, align: al(i) }));
    doc.save().lineWidth(0.5).strokeColor(`#${LINE}`).rect(x, y, W, h).stroke();
    let lx = x; for (let i = 0; i < cols.length - 1; i++) { lx += cols[i]; doc.moveTo(lx, y).lineTo(lx, y + h).stroke(); }
    doc.restore();
    doc.y = y + h; doc.x = x;
  };
  drawRow(header, { bold: true, fill: `#${BRAND}`, color: "#ffffff" });
  rows.forEach((r, i) => drawRow(r, { fill: i % 2 ? `#${ZEBRA}` : "#ffffff" }));
  doc.moveDown(0.4);
}

export function buildReportPdf(d: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
      const fontDir = path.join(process.cwd(), "lib/server/fonts");
      doc.registerFont("TH", fs.readFileSync(path.join(fontDir, "Sarabun-Regular.ttf")));
      doc.registerFont("TH-B", fs.readFileSync(path.join(fontDir, "Sarabun-Bold.ttf")));
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const left = doc.page.margins.left;
      const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const bottom = doc.page.height - doc.page.margins.bottom;
      const ensure = (h: number) => { if (doc.y + h > bottom) doc.addPage(); };

      // Masthead
      doc.font("TH").fontSize(10).fillColor(`#${MUTED}`).text("ระบบฐานข้อมูลผู้สูงอายุแห่งชาติ (NEDP)  ·  โครงการมุ่งเป้าสูงวัย ปี 2568", left, doc.y, { align: "center", width: W });
      doc.moveDown(0.15);
      doc.font("TH-B").fontSize(19).fillColor(`#${BRAND}`).text("รายงานการติดตามผลการดำเนินงานรายเดือน", left, doc.y, { align: "center", width: W });
      doc.moveDown(0.35);
      const ry = doc.y;
      doc.save().lineWidth(1.2).strokeColor(`#${BRAND}`).moveTo(left, ry).lineTo(left + W, ry).stroke().restore();
      doc.x = left; doc.moveDown(0.7);

      pdfSection(doc, "ข้อมูลโครงการ", W);
      pdfKV(doc, left, W, metaPairs(d), ensure);

      pdfSection(doc, "สรุปคะแนน AAI รายมิติ (ก่อน → หลัง)", W);
      pdfTable(doc, left, W, [0.4, 0.2, 0.2, 0.2], ["มิติ AAI", "ก่อน", "หลัง", "เปลี่ยนแปลง"],
        d.dims.map((dim) => [dim.label, fmtNum(dim.before), fmtNum(dim.after), fmtDelta(dim.before, dim.after)]), ensure,
        { aligns: ["left", "center", "center", "center"] });

      if (d.qSummary.length) {
        pdfSection(doc, `สรุปแบบสอบถามเฉพาะโครงการ (${d.qPersons} คน)`, W);
        pdfTable(doc, left, W, [0.46, 0.18, 0.18, 0.18], ["เครื่องมือ / คะแนนเฉพาะ", "ค่าเฉลี่ย", "จำนวน (คน)", "ธงเตือน"],
          d.qSummary.map((r) => [r.label, fmtNum(r.mean), String(r.n), r.flagged ? String(r.flagged) : "—"]), ensure,
          { aligns: ["left", "center", "center", "center"] });
      }

      pdfSection(doc, "ผลการดำเนินงานรายพื้นที่ (ตำบล)", W);
      for (const [i, r] of d.rows.entries()) {
        ensure(120);
        doc.font("TH-B").fontSize(11.5).fillColor(`#${BRAND}`).text(`พื้นที่ที่ ${i + 1}:  ตำบล${r.tambon}   อำเภอ${r.amphoe}   จังหวัด${r.province}`, left, doc.y, { width: W });
        doc.x = left; doc.moveDown(0.2);
        if (Object.keys(r.values).length === 0) {
          doc.font("TH").fontSize(10.5).fillColor(`#${MUTED}`).text("(ยังไม่ส่งข้อมูล)", left, doc.y, { width: W });
          doc.x = left; doc.moveDown(0.4);
          continue;
        }
        pdfTable(doc, left, W, [0.6, 0.2, 0.2], ["ตัวชี้วัด", "ก่อน", "หลัง"],
          GROUPS.map((g) => [`${g.label} (${g.unit})`, g.before ? (r.values[g.before] ?? "—") : "—", r.values[g.after] ?? "—"]), ensure,
          { aligns: ["left", "center", "center"] });
        doc.font("TH").fontSize(10.5).fillColor(`#${INK}`);
        if (r.values.issues) { ensure(15); doc.text(`ปัญหา/อุปสรรค:  ${r.values.issues}`, left, doc.y, { width: W }); doc.x = left; }
        if (r.values.recommendations) { ensure(15); doc.text(`ข้อเสนอแนะ:  ${r.values.recommendations}`, left, doc.y, { width: W }); doc.x = left; }
        doc.moveDown(0.5);
      }

      // Signature block (lower-right)
      ensure(110);
      doc.moveDown(1.2);
      const sigX = left + W * 0.52, sigW = W * 0.48;
      const sigLine = (t: string, gap = 0.45) => { doc.font("TH").fontSize(10.5).fillColor(`#${INK}`).text(t, sigX, doc.y, { width: sigW, align: "center" }); doc.x = left; doc.moveDown(gap); };
      sigLine("ลงชื่อ ............................................");
      sigLine(`(  ${d.researcher || "........................................"}  )`);
      sigLine("ผู้รับผิดชอบโครงการ", 0.3);
      sigLine("วันที่ ........../........../..............", 0);

      // Footer page numbers
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.font("TH").fontSize(9).fillColor(`#${MUTED}`)
          .text(`NEDP · ${d.monthLabel} · จัดทำเมื่อ ${d.generatedAt} · หน้า ${i + 1}/${range.count}`,
            doc.page.margins.left, doc.page.height - doc.page.margins.bottom + 8, { align: "center", width: W });
      }
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
