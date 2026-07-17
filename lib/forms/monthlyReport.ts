/**
 * Curated FORM layout for the monthly per-location report — the friendly ทีละพื้นที่ UI over the
 * canonical indicators in lib/factMonthly.ts. This is the MASTER format: the grid (ตาราง) and the
 * Excel template mirror it field-for-field, all derived from the shared `METRIC_GROUPS`.
 *
 * Plain TS (no client-only imports) so both the form component AND the server write-path import it.
 */
import { METRIC_GROUPS, ALL_METRIC_KEYS, REQUIRED_KEYS, type MetricGroup, type MetricScale } from "@/lib/factMonthly";

export { REQUIRED_KEYS };

export interface MonthlyIndicator {
  label: string;
  /** The หลัง (this-month) value — always shown, counts toward completeness. */
  afterKey: string;
  /** The ก่อน baseline — omit to disable the pair (e.g. the "เพิ่ม 10%" count is หลัง-only). */
  beforeKey?: string;
  unit?: string;
  /** Numeric scale → input constraints (count = integer คน; score = 0–100, 2-digit/decimal). */
  scale?: MetricScale;
  /** Brief explanation, rendered under the label (AAI dimensions — requirement item 14). */
  desc?: string;
}

export interface MonthlySection {
  title: string;
  indicators: MonthlyIndicator[];
}

const byId = Object.fromEntries(METRIC_GROUPS.map((g) => [g.id, g])) as Record<string, MetricGroup>;
const toIndicator = (id: string): MonthlyIndicator => {
  const g = byId[id];
  return { label: g.label, unit: g.unit, scale: g.scale, beforeKey: g.before, afterKey: g.after, desc: g.desc };
};

/** Section grouping for the ทีละพื้นที่ form — references METRIC_GROUPS by id (the metrics live there). */
export const MONTHLY_SECTIONS: MonthlySection[] = [
  {
    title: "ผลการดำเนินงานรายเดือน",
    indicators: ["skilldev", "aai10", "staffdev"].map(toIndicator),
  },
  {
    title: "คะแนน AAI รายมิติ",
    indicators: ["aai_d1", "aai_d2", "aai_d3", "aai_d4"].map(toIndicator),
  },
];

/** Optional free-text notes. */
export const NOTE_FIELDS = [
  { key: "issues", label: "ปัญหา/อุปสรรค", placeholder: "ระบุปัญหาที่พบ (ถ้ามี)" },
  { key: "recommendations", label: "ข้อเสนอแนะ", placeholder: "ข้อเสนอแนะเพิ่มเติม (ถ้ามี)" },
] as const;

export type OpStatus = "not_started" | "in_progress" | "completed";

export const STATUS_LABEL: Record<OpStatus, string> = {
  not_started: "ยังไม่เริ่ม",
  in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น",
};

function isFilled(v: string | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

/** How many required (หลัง) values are present. */
export function filledRequiredCount(values: Record<string, string>): number {
  return REQUIRED_KEYS.filter((k) => isFilled(values[k])).length;
}

/**
 * Auto-derive the operating status from data completeness (requirement item 11):
 *   • ยังไม่เริ่ม  — no metric value at all (ก่อน or หลัง)
 *   • กำลังดำเนินการ — some data, but not every required หลัง value is filled
 *   • เสร็จสิ้น    — every required หลัง value is filled
 */
export function deriveStatus(values: Record<string, string>): OpStatus {
  if (filledRequiredCount(values) >= REQUIRED_KEYS.length) return "completed";
  return ALL_METRIC_KEYS.some((k) => isFilled(values[k])) ? "in_progress" : "not_started";
}

/** The auto-status as its Thai label — persisted into data.status so every surface + the report agree. */
export function statusLabelOf(values: Record<string, string>): string {
  return STATUS_LABEL[deriveStatus(values)];
}

/** 0–100 completion used for the progress bar and the stored completion_pct. */
export function completionPct(values: Record<string, string>): number {
  return Math.round((filledRequiredCount(values) / REQUIRED_KEYS.length) * 100);
}
