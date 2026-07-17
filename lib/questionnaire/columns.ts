/**
 * Turn a questionnaire schema (+ selected modules) into a flat Excel column spec: the shared identity /
 * consent / location block (mirroring factPersons so PDPA + tambon-matching are identical) followed by one
 * column per question (derived questions omitted — computed server-side). Drives the template builder,
 * the upload validator, and the data-dictionary sheet.
 */
import { isQOption, type QuestionnaireSchema, type QType } from "./schema";

export interface QCol {
  key: string;               // template key: identity name OR question_id
  th: string;                // Thai header
  kind: "identity" | "question";
  qtype?: QType;
  min?: number;
  max?: number;
  optionValues?: string[];              // radio: accepted stored values (as strings)
  labelToValue?: Record<string, string>; // radio: Thai label → stored value (accept either)
  required?: boolean;
  help?: string;
}

const IDENTITY_COLS: QCol[] = [
  { key: "person_code", th: "รหัสผู้เข้าร่วม", kind: "identity", help: "เว้นว่าง = ออกให้อัตโนมัติ; ใส่รหัสเดิม = อัปเดตคนเดิม" },
  { key: "full_name", th: "ชื่อ–สกุล", kind: "identity", help: "ข้อมูลส่วนบุคคล (PDPA) — เข้ารหัสจัดเก็บ" },
  { key: "consent", th: "ได้รับความยินยอม (PDPA)", kind: "identity", required: true, optionValues: ["1"],
    labelToValue: { "ยินยอม": "1", "ได้": "1", "yes": "1", "ไม่ยินยอม": "0", "ไม่": "0", "no": "0" },
    help: "ระบุ ‘ยินยอม’ จึงจะนำเข้าได้" },
  { key: "province", th: "จังหวัด", kind: "identity", required: true },
  { key: "amphoe", th: "อำเภอ", kind: "identity", required: true },
  { key: "tambon", th: "ตำบล", kind: "identity", required: true },
  { key: "round", th: "รอบการประเมิน (ก่อน/หลัง)", kind: "identity",
    labelToValue: { "ก่อน": "pre", "pre": "pre", "หลัง": "post", "post": "post" } },
  { key: "year_month", th: "เดือน (พ.ศ. YYYY-MM)", kind: "identity" },
];

export function schemaToColumns(schema: QuestionnaireSchema, modules: string[]): QCol[] {
  const cols: QCol[] = [...IDENTITY_COLS];
  const sections = schema.sections.filter((s) => modules.length === 0 || s.module === "general" || modules.includes(s.module));
  for (const s of sections) {
    for (const q of s.questions) {
      if (q.type === "derived") continue;
      const col: QCol = { key: q.id, th: q.label, kind: "question", qtype: q.type, min: q.min, max: q.max, required: q.required };
      if (q.type === "radio" && q.options) {
        const opts = q.options.filter(isQOption);
        col.optionValues = opts.map((o) => String(o.value));
        col.labelToValue = Object.fromEntries(opts.map((o) => [o.label, String(o.value)]));
      }
      cols.push(col);
    }
  }
  return cols;
}

/** Human-readable "accepted values" for the data-dictionary sheet. */
export function colRangeText(c: QCol): string {
  if (c.optionValues?.length) return c.optionValues.join(" / ");
  if (c.min != null && c.max != null) return `${c.min}–${c.max}`;
  return "";
}
