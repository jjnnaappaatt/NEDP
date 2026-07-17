/**
 * Per-person NEDP questionnaire schema — the canonical INDIVIDUAL-level intake columns that a project
 * head submits (one row per elderly person) so the platform can DERIVE the AAI (scoring_mode='derived').
 *
 * SINGLE SOURCE OF TRUTH (mirrors lib/factMonthly.ts): every per-person field is declared ONCE in
 * `PERSON_COLUMNS`. The Excel template headers, the "คำอธิบาย" data-dictionary sheet, the upload
 * validator, and the in-app guide's field table (components/integrate/PersonDataDictionary.tsx) all
 * derive from it, so those surfaces can never drift.
 *
 * `key`  = the template/reverse-map id. For SCORED fields it is ALSO the `raw_answers` JSON key that the
 *          DB scorer reads (public.aai_derive_indicators + fn_score_person_assessment).
 * `th`   = the Thai column header shown in the sheet + guide.
 * `rawKey` = present ⟺ the value is written into `person_assessments.raw_answers` for derivation.
 * `indicator` = the AAI indicator (of the 22) this field feeds — traceability only.
 * The 5 items marked `kind:"gap"` are NEW (fill the AAI gaps that had no NEDP question); their formulas
 * are implemented in migration 20260712000000 and are PROVISIONAL pending committee sign-off.
 */

export type PersonFieldKind = "identity" | "meta" | "aai_q" | "tool" | "gap";
export type AaiDomain = "D1" | "D2" | "D3" | "D4";

export interface PersonColumn {
  /** template id; for scored fields === the raw_answers key. */
  key: string;
  /** Thai header. */
  th: string;
  kind: PersonFieldKind;
  /** raw_answers JSON key the scorer reads (scored fields only). */
  rawKey?: string;
  /** which of the 22 AAI indicators this feeds (traceability). */
  indicator?: string;
  /** which AAI domain the indicator rolls into. */
  domain?: AaiDomain;
  /** numeric range (inclusive) for validation. */
  min?: number;
  max?: number;
  /** coded fields: accepted Thai label → canonical stored value (also accepts the canonical value itself). */
  enumMap?: Record<string, string>;
  /** required in every row (hard-gated by the upload validator). */
  required?: boolean;
  help: string;
}

/** Canonical AAI domain labels (from components/portal/aaiDomains.ts — the CORRECT ones; note the
 *  monthly-report surface in factMonthly.ts carries a stale "D1 = ด้านสุขภาพ" label that is wrong). */
export const AAI_DOMAIN_LABEL: Record<AaiDomain, string> = {
  D1: "การมีงานทำ / รายได้",
  D2: "การมีส่วนร่วมในสังคม",
  D3: "สุขภาพ / ความมั่นคง",
  D4: "สภาพแวดล้อม / ศักยภาพ",
};

export const PERSON_COLUMNS: PersonColumn[] = [
  // ── Identity & consent (→ enroll_person / persons row; NOT scored) ────────────────────────────────
  { key: "person_code", th: "รหัสผู้เข้าร่วม", kind: "identity",
    help: "เว้นว่างไว้ = ระบบออกรหัสให้อัตโนมัติ (รูปแบบ <รหัสตำบล6หลัก>-เลขลำดับ) หากมีรหัสเดิมของผู้เข้าร่วมให้กรอกเพื่ออัปเดตข้อมูลคนเดิม" },
  { key: "full_name", th: "ชื่อ–สกุล", kind: "identity",
    help: "ข้อมูลส่วนบุคคล (PDPA) — จัดเก็บแบบเข้ารหัส ใช้เพื่อยืนยันตัวตนเท่านั้น ไม่แสดงบนแดชบอร์ด/รายงาน" },
  { key: "consent", th: "ได้รับความยินยอม (PDPA)", kind: "identity", required: true,
    enumMap: { "ยินยอม": "1", "ได้": "1", "yes": "1", "ไม่ยินยอม": "0", "ไม่ได้": "0", "no": "0" },
    help: "ต้องระบุ 'ยินยอม' จึงจะนำเข้าได้ — ผู้เข้าร่วมยินยอมให้เก็บ/ประมวลผลข้อมูลตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล" },
  { key: "province", th: "จังหวัด", kind: "identity", required: true, help: "ต้องตรงกับพื้นที่ดำเนินการของโครงการ" },
  { key: "amphoe", th: "อำเภอ", kind: "identity", required: true, help: "ต้องตรงกับพื้นที่ดำเนินการของโครงการ" },
  { key: "tambon", th: "ตำบล", kind: "identity", required: true, help: "ต้องตรงกับพื้นที่ดำเนินการของโครงการ (ใช้จับคู่รหัสตำบล TIS-1099)" },
  { key: "sex", th: "เพศ", kind: "identity", enumMap: { "ชาย": "M", "ช": "M", "M": "M", "หญิง": "F", "ญ": "F", "F": "F", "อื่นๆ": "other", "อื่น ๆ": "other", "other": "other" },
    help: "ชาย / หญิง / อื่นๆ" },
  { key: "round", th: "รอบการประเมิน", kind: "identity", enumMap: { "ก่อน": "pre", "pre": "pre", "หลัง": "post", "post": "post" },
    help: "ก่อน (baseline) หรือ หลัง (post) — เว้นว่าง = ก่อน" },
  { key: "year_month", th: "เดือนที่ประเมิน (พ.ศ. YYYY-MM)", kind: "identity",
    help: "เช่น 2569-07 — เว้นว่าง = เดือนปัจจุบัน" },

  // ── Demographics used by the scorer (also written to raw_answers) ─────────────────────────────────
  { key: "age", th: "อายุ (ปี)", kind: "meta", rawKey: "age", min: 50, max: 120,
    help: "อายุจริงเป็นปี (≥50) — ใช้กำหนดช่วงอายุ (age band) และมิติการมีงานทำ (D1)" },
  { key: "education", th: "ระดับการศึกษา (0–4)", kind: "meta", rawKey: "education", indicator: "educational_attainment", domain: "D4", min: 0, max: 4,
    help: "0 ไม่ได้เรียน · 1 ประถม · 2 มัธยม/ปวช. · 3 อนุปริญญา/ปวส. · 4 ปริญญาตรีขึ้นไป → มิติสภาพแวดล้อม (การศึกษา)" },
  { key: "occupation", th: "การทำงาน (0–3)", kind: "meta", rawKey: "occupation", indicator: "employment", domain: "D1", min: 0, max: 3,
    help: "0 ว่างงาน/เกษียณ · 1 ลูกจ้าง · 2 อาชีพอิสระ · 3 อื่นๆ (1/2/3 = มีงานทำ) → มิติการมีงานทำ (D1)" },

  // ── AAI general questionnaire (◎ ข้อมูลทั่วไป) → raw_answers aai_q* ────────────────────────────────
  { key: "aai_q1", th: "AAI Q1 สุขภาพกายที่ประเมินเอง (0–4)", kind: "aai_q", rawKey: "aai_q1", min: 0, max: 4,
    help: "ประเมินสุขภาพกายของตนเอง (สำรองไว้สำหรับการให้คะแนนในอนาคต)" },
  { key: "aai_q2", th: "AAI Q2 พฤติกรรมออกกำลังกาย (0–4)", kind: "aai_q", rawKey: "aai_q2", indicator: "physical_exercise", domain: "D3", min: 0, max: 4,
    help: "ความสม่ำเสมอของการออกกำลังกาย → ตัวชี้วัด physical_exercise" },
  { key: "aai_q3", th: "AAI Q3 ทำกิจวัตรประจำวันด้วยตนเอง (0–3)", kind: "aai_q", rawKey: "aai_q3", indicator: "independent_living", domain: "D3", min: 0, max: 3,
    help: "ADL การดูแลตนเอง → ใช้เป็น independent_living เมื่อไม่มีคะแนน Barthel" },
  { key: "aai_q4", th: "AAI Q4 เข้าร่วมกิจกรรมชมรม (0–4)", kind: "aai_q", rawKey: "aai_q4", indicator: "voluntary", domain: "D2", min: 0, max: 4,
    help: "การเข้าร่วมชมรม/กลุ่ม → voluntary (D2) และร่วมกับ Q5 เป็น social_connectedness (D4)" },
  { key: "aai_q5", th: "AAI Q5 เข้าร่วมกิจกรรมชุมชน (0–4)", kind: "aai_q", rawKey: "aai_q5", indicator: "political", domain: "D2", min: 0, max: 4,
    help: "การเข้าร่วมกิจกรรมวันสำคัญ/ชุมชน → political (D2) และร่วมกับ Q4 เป็น social_connectedness (D4)" },
  { key: "aai_q6", th: "AAI Q6 ใช้เทคโนโลยีสารสนเทศ (0–3)", kind: "aai_q", rawKey: "aai_q6", indicator: "ict_use", domain: "D4", min: 0, max: 3,
    help: "การใช้ ICT → ict_use (D4) และเป็นตัวแทน lifelong_learning (D3) [ชั่วคราว]" },
  { key: "aai_q7", th: "AAI G.7 ความต่อเนื่องการตรวจสุขภาพ (0–4)", kind: "aai_q", rawKey: "aai_q7", indicator: "health_access", domain: "D3", min: 0, max: 4,
    help: "ความต่อเนื่องในการตรวจสุขภาพ → ตัวแทน health_access (การเข้าถึงบริการ)" },
  { key: "aai_q8", th: "AAI G.8 ระดับการควบคุมโรค (0–4)", kind: "aai_q", rawKey: "aai_q8", min: 0, max: 4,
    help: "เก็บเฉพาะผู้มีโรคประจำตัว (สำรองไว้สำหรับอนาคต)" },

  // ── Clinical tool raw scores (→ tool_* columns + clinical flags; some feed indicators) ────────────
  { key: "barthel", th: "Barthel ADL (0–100)", kind: "tool", rawKey: "barthel", indicator: "independent_living", domain: "D3", min: 0, max: 100,
    help: "ดัชนีบาร์เธล — โครงการหกล้ม; ธง ≤90 บกพร่อง ADL → เป็น independent_living โดยตรง (0–100)" },
  { key: "environment", th: "การประเมินสภาพแวดล้อม (0–9)", kind: "tool", rawKey: "environment", indicator: "physical_safety", domain: "D3", min: 0, max: 9,
    help: "ความเสี่ยงในบ้าน — ยิ่งน้อยยิ่งปลอดภัย; ธง ≥3 → physical_safety = 100·(1−คะแนน/9) [ชั่วคราว]" },
  { key: "frail", th: "FRAIL (0–5)", kind: "tool", rawKey: "frail", min: 0, max: 5,
    help: "ภาวะเปราะบาง — โครงการหกล้ม; ธง ≥3 (Frail)" },
  { key: "fes_i", th: "Short FES-I (7–28)", kind: "tool", rawKey: "fes_i", min: 7, max: 28,
    help: "ความกลัวการหกล้ม — โครงการหกล้ม; ธง ≥17" },
  { key: "l_iadl", th: "L-IADL (0–8)", kind: "tool", rawKey: "l_iadl", min: 0, max: 8,
    help: "กิจวัตรที่ซับซ้อน — โครงการหกล้ม; ธง <8" },
  { key: "minicog", th: "Mini-Cog (0–5)", kind: "tool", rawKey: "minicog", min: 0, max: 5,
    help: "คัดกรองสมองเสื่อม — โครงการหกล้ม; ธง ≤2" },
  { key: "eq_vas", th: "EQ-VAS (0–100)", kind: "tool", rawKey: "eq_vas", min: 0, max: 100,
    help: "การรับรู้สุขภาพโดยรวม; ธง <50" },
  { key: "tgds", th: "TGDS-15 (0–15)", kind: "tool", rawKey: "tgds", indicator: "mental_wellbeing", domain: "D4", min: 0, max: 15,
    help: "ซึมเศร้าในผู้สูงอายุ — โครงการโภชนาการ; ธง ≥7 → mental_wellbeing = 100·(1−คะแนน/15)" },
  { key: "mna", th: "MNA-SF (0–14)", kind: "tool", rawKey: "mna", min: 0, max: 14,
    help: "คัดกรองภาวะโภชนาการ (แบบสั้น 0–14, ไม่ใช่ 0–30) — โครงการโภชนาการ; ธง ≤11" },

  // ── 5 NEW items (fill the AAI gaps — PROVISIONAL, awaiting committee sign-off) ────────────────────
  { key: "care_children_q", th: "★ ดูแลบุตร/หลาน (เด็ก) เป็นประจำ (0/1)", kind: "gap", rawKey: "care_children_q", indicator: "care_children", domain: "D2", min: 0, max: 1,
    enumMap: { "ใช่": "1", "ประจำ": "1", "yes": "1", "ไม่ใช่": "0", "ไม่": "0", "no": "0" },
    help: "ข้อใหม่ (เติมช่องว่าง AAI): 1 = ดูแลเป็นประจำ, 0 = ไม่ → ตัวชี้วัด care_children (D2)" },
  { key: "care_elderly_q", th: "★ ดูแลผู้สูงอายุอื่นในครัวเรือน/ชุมชน (0/1)", kind: "gap", rawKey: "care_elderly_q", indicator: "care_elderly", domain: "D2", min: 0, max: 1,
    enumMap: { "ใช่": "1", "ประจำ": "1", "yes": "1", "ไม่ใช่": "0", "ไม่": "0", "no": "0" },
    help: "ข้อใหม่: 1 = ดูแลเป็นประจำ, 0 = ไม่ → ตัวชี้วัด care_elderly (D2)" },
  { key: "income_adequacy", th: "★ รายได้เพียงพอกับค่าใช้จ่าย (0–4)", kind: "gap", rawKey: "income_adequacy", indicator: "relative_income", domain: "D3", min: 0, max: 4,
    help: "ข้อใหม่: 0 ไม่พอใช้มาก … 4 พอและเหลือเก็บ → relative_income = 100·ค่า/4 (D3)" },
  { key: "poverty_risk", th: "★ เสี่ยงยากจน/รายได้ต่ำกว่าเส้นความยากจน (0/1)", kind: "gap", rawKey: "poverty_risk", indicator: "no_poverty_risk", domain: "D3", min: 0, max: 1,
    enumMap: { "เสี่ยง": "1", "ใช่": "1", "yes": "1", "ไม่เสี่ยง": "0", "ไม่": "0", "no": "0" },
    help: "ข้อใหม่: 1 = มีความเสี่ยง, 0 = ไม่ → no_poverty_risk = 100·(1−ค่า) (D3)" },
  { key: "material_deprivation", th: "★ ขาดแคลนปัจจัยพื้นฐาน (จำนวนรายการ 0–4)", kind: "gap", rawKey: "material_deprivation", indicator: "no_material_deprivation", domain: "D3", min: 0, max: 4,
    help: "ข้อใหม่: นับจำนวนที่ขาดแคลนใน 4 ด้าน (อาหาร/ยา/เครื่องนุ่งห่ม/ที่อยู่อาศัย) → no_material_deprivation = 100·(1−จำนวน/4) (D3)" },
];

/** Location columns (จังหวัด/อำเภอ/ตำบล) — used to match a row back to a project tambon via `locKey`. */
export const PERSON_LOC_KEYS = ["province", "amphoe", "tambon"] as const;

/** Fields hard-required in every row (validator rejects the row otherwise). */
export const REQUIRED_PERSON_KEYS: string[] = PERSON_COLUMNS.filter((c) => c.required).map((c) => c.key);

/** Thai header (trimmed) → PERSON_COLUMNS key. */
export const PERSON_TH_TO_KEY = new Map<string, string>(PERSON_COLUMNS.map((c) => [c.th, c.key]));

/** Columns that carry a scored value into raw_answers (have a rawKey). */
export const PERSON_RAW_COLUMNS: PersonColumn[] = PERSON_COLUMNS.filter((c) => !!c.rawKey);

/** Age (years) → the `persons.age_band` enum value; null when under 50 (not eligible). */
export function deriveAgeBand(age: number | null | undefined): string | null {
  if (age == null || !Number.isFinite(age)) return null;
  if (age >= 75) return "75+";
  if (age >= 70) return "70-74";
  if (age >= 65) return "65-69";
  if (age >= 60) return "60-64";
  if (age >= 55) return "55-59";
  if (age >= 50) return "50-54";
  return null;
}

/**
 * Build the `raw_answers` object the DB scorer reads, from a row keyed by PERSON_COLUMNS.key.
 * Only includes rawKey-bearing fields that have a non-empty value.
 */
export function toRawAnswers(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of PERSON_RAW_COLUMNS) {
    const v = (row[c.key] ?? "").trim();
    if (v !== "") out[c.rawKey!] = v;
  }
  return out;
}
