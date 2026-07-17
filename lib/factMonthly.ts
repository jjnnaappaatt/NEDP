/**
 * FactMonthlyMonitor schema — the canonical monthly-report columns, mirrored from the official
 * Power BI fact table `FactMonthlyMonitor` (NEDP_MonthlyMonitor_PowerBI.xlsx) MINUS its first three
 * columns (ReportMonth / ProjectID / ProjectName) which the system derives automatically from the
 * project register + the current month.
 *
 * SINGLE SOURCE OF TRUTH: every monthly indicator is declared ONCE in `METRIC_GROUPS`. Both
 * `FACT_COLUMNS` (the flat grid/Excel/report column list) AND the ทีละพื้นที่ form layout
 * (`MONTHLY_SECTIONS` in lib/forms/monthlyReport.ts) are derived from it, so the three data-entry
 * surfaces (ทีละพื้นที่ · ตาราง · Excel) can never drift apart again. The ทีละพื้นที่ form is the
 * master format; the grid and Excel mirror it field-for-field.
 *
 * `key` = the metric id stored in `location_submissions.data` (lower-case, matches monitor_facts
 * columns the bot's /m/export/monthly_monitor.csv reads). `th` = the Thai header shown in the sheet.
 * `src` = the original FactMonthlyMonitor English column (shown in the README for traceability).
 */
export type FactKind = "metric" | "text";

export interface FactColumn {
  key: string;
  th: string;
  src: string;
  kind: FactKind;
  help: string;
}

/** Input scale → drives the numeric constraints in every entry surface (form + grid). */
export type MetricScale = "count" | "score";

/**
 * One monthly indicator. `before` is OPTIONAL: omit it for หลัง-only headcounts (e.g. the
 * "AAI เพิ่ม 10%" count), which then render as a SINGLE column everywhere instead of a ก่อน/หลัง pair.
 */
export interface MetricGroup {
  /** stable id, e.g. "aai10" / "aai_d1". */
  id: string;
  /** label WITHOUT any (ก่อน)/(หลัง) suffix. */
  label: string;
  /** "คน" (headcount, integer) or "0–100" (AAI score, 2-digit / decimal). */
  unit: string;
  scale: MetricScale;
  /** Power BI base name; `_Before`/`_After` is appended per generated column. */
  src: string;
  /** the always-present หลัง (this-month) key. */
  after: string;
  /** the optional ก่อน baseline key — omit for single (หลัง-only) metrics. */
  before?: string;
  /** brief description, shown under AAI dimensions in the form. */
  desc?: string;
}

/** The canonical 7 indicators, in FactMonthlyMonitor order. EDIT HERE to change every surface at once. */
export const METRIC_GROUPS: MetricGroup[] = [
  {
    id: "skilldev", label: "จำนวนคนที่เข้ารับพัฒนาทักษะ", unit: "คน", scale: "count", src: "SkillDev",
    before: "skilldev_before", after: "skilldev_after",
  },
  {
    // หลัง-only headcount — ONE merged column (was a ก่อน/หลัง pair). Matches the ทีละพื้นที่ master.
    id: "aai10", label: "จำนวนคนที่ AAI เพิ่ม 10% หลังเข้าโครงการ", unit: "คน", scale: "count", src: "AAI10Pct",
    after: "aai10_after",
  },
  {
    id: "aai_d1", label: "AAI ด้านการมีงานทำ/รายได้", unit: "0–100", scale: "score", src: "AAI_D1Health",
    before: "aai_d1_before", after: "aai_d1_after",
    desc: "การมีงานทำ รายได้ และความมั่นคงทางการเงินของผู้สูงอายุ",
  },
  {
    id: "aai_d2", label: "AAI ด้านการมีส่วนร่วม", unit: "0–100", scale: "score", src: "AAI_D2Participation",
    before: "aai_d2_before", after: "aai_d2_after",
    desc: "การมีส่วนร่วมทางสังคม เศรษฐกิจ และกิจกรรมของชุมชน",
  },
  {
    id: "aai_d3", label: "AAI ด้านสุขภาพและความมั่นคง", unit: "0–100", scale: "score", src: "AAI_D3Security",
    before: "aai_d3_before", after: "aai_d3_after",
    desc: "สุขภาพกายและใจ การเข้าถึงบริการ ความมั่นคงด้านรายได้ และความปลอดภัยในชีวิต",
  },
  {
    id: "aai_d4", label: "AAI ด้านสภาพแวดล้อม", unit: "0–100", scale: "score", src: "AAI_D4Environ",
    before: "aai_d4_before", after: "aai_d4_after",
    desc: "สภาพแวดล้อมและสิ่งอำนวยความสะดวกที่เอื้อต่อการใช้ชีวิตของผู้สูงอายุ",
  },
  {
    id: "staffdev", label: "จำนวนบุคลากรที่เข้ารับการพัฒนาทักษะ", unit: "คน", scale: "count", src: "StaffDev",
    before: "staffdev_before", after: "staffdev_after",
  },
];

/** Every metric key (ก่อน + หลัง) in column order — for completeness checks + positional-free iteration. */
export const ALL_METRIC_KEYS: string[] = METRIC_GROUPS.flatMap((g) => (g.before ? [g.before, g.after] : [g.after]));

/** The หลัง (this-month) keys that count toward completeness & auto-status — one per indicator. */
export const REQUIRED_KEYS: string[] = METRIC_GROUPS.map((g) => g.after);

const metricHelp = (g: MetricGroup) => (g.scale === "score" ? "คะแนน 0–100" : "จำนวนคน");

/** The 3 free-text / derived columns that follow the metrics (Issues, Recommendations, StatusFlag). */
const TEXT_COLUMNS: FactColumn[] = [
  { key: "issues", th: "ปัญหา/อุปสรรค", src: "Issues", kind: "text", help: "ข้อความอธิบายปัญหาที่พบ" },
  { key: "recommendations", th: "ข้อเสนอแนะ", src: "Recommendations", kind: "text", help: "ข้อความข้อเสนอแนะ" },
  { key: "status", th: "สถานะ", src: "StatusFlag", kind: "text", help: "ระบบกำหนดอัตโนมัติจากความครบถ้วน (ยังไม่เริ่ม / กำลังดำเนินการ / เสร็จสิ้น)" },
];

/** The data columns, in FactMonthlyMonitor order — DERIVED from METRIC_GROUPS (+ 3 text columns). */
export const FACT_COLUMNS: FactColumn[] = [
  ...METRIC_GROUPS.flatMap((g): FactColumn[] => {
    const after: FactColumn = {
      key: g.after, th: g.before ? `${g.label} (หลัง)` : g.label,
      src: `${g.src}_After`, kind: "metric", help: metricHelp(g),
    };
    if (!g.before) return [after];
    const before: FactColumn = {
      key: g.before, th: `${g.label} (ก่อน)`, src: `${g.src}_Before`, kind: "metric", help: metricHelp(g),
    };
    return [before, after];
  }),
  ...TEXT_COLUMNS,
];

/** The 3 location columns (จังหวัด/อำเภอ/ตำบล) — used to match rows back to a project location. */
export const LOC_COLUMNS = [
  { key: "province", th: "จังหวัด", src: "Province" },
  { key: "amphoe", th: "อำเภอ", src: "District" },
  { key: "tambon", th: "ตำบล", src: "SubDistrict" },
] as const;

/** Normalised location key — match a sheet row back to a project location by จังหวัด|อำเภอ|ตำบล. */
export function locKey(province: string, amphoe: string, tambon: string): string {
  const n = (s: string) => (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  return `${n(province)}|${n(amphoe)}|${n(tambon)}`;
}

/** Map a Thai header (trimmed) → its FACT_COLUMNS key. */
export const TH_TO_KEY = new Map<string, string>(FACT_COLUMNS.map((c) => [c.th, c.key]));
