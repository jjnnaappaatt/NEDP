/**
 * Clinical tool scoring — a 1:1 TypeScript port of aai_mvp/nedp/scoring.py. Pure functions of a flat
 * `{question_id: value}` answer map; each returns a ScoringResult. Risk level + flag are computed on the
 * RAW (unrounded) values exactly as the Python source does, so the clinical decision is identical; only
 * the displayed `rawScore` uses JS rounding (≤0.05 difference in rare half-boundary cases). Thai
 * `scoreLabel`s are kept verbatim — they carry the referral text ("— ส่งต่อ…").
 */

export type RiskLevel = "normal" | "medium" | "high";
export interface ScoringResult { rawScore: number | null; scoreLabel: string; riskLevel: RiskLevel; flag: boolean }
export type Answers = Record<string, unknown>;

const NONE: ScoringResult = { rawScore: null, scoreLabel: "", riskLevel: "normal", flag: false };
const R = (raw: number | null, scoreLabel: string, riskLevel: RiskLevel, flag: boolean): ScoringResult =>
  ({ rawScore: raw, scoreLabel, riskLevel, flag });

function _int(a: Answers, qid: string): number | null {
  const v = a[qid];
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
function _float(a: Answers, qid: string): number | null {
  const v = a[qid];
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
const round1 = (x: number) => Math.round(x * 10) / 10;
/** Python-ish float text: integers show one decimal ("2.0"), else natural ("2.5"). */
const pf = (x: number) => (Number.isInteger(x) ? x.toFixed(1) : String(x));

const sumAnswered = (a: Answers, qids: string[]): number | null => {
  const vals = qids.map((q) => _int(a, q)).filter((v): v is number => v !== null);
  return vals.length ? vals.reduce((s, x) => s + x, 0) : null;
};

// ── General ─────────────────────────────────────────────────────────────────
export const score_aai = (a: Answers): ScoringResult => {
  const total = sumAnswered(a, Array.from({ length: 8 }, (_, i) => `G.aai_q${i + 1}`));
  return total === null ? NONE : R(total, `${total}/30`, "normal", false);
};
export const score_eq5d = (a: Answers): ScoringResult => {
  const total = sumAnswered(a, ["F.eq5d_1", "F.eq5d_2", "F.eq5d_3", "F.eq5d_4", "F.eq5d_5"]);
  if (total === null) return NONE;
  const [label, level]: [string, RiskLevel] =
    total <= 10 ? ["คุณภาพชีวิตดี", "normal"] : total <= 15 ? ["คุณภาพชีวิตปานกลาง", "medium"] : ["คุณภาพชีวิตต่ำ", "high"];
  return R(total, label, level, total > 15);
};
export const score_eq_vas = (a: Answers): ScoringResult => {
  let v = _float(a, "F.eq_vas");
  if (v === null) return NONE;
  v = Math.max(0, Math.min(100, v));
  const [label, level]: [string, RiskLevel] =
    v >= 70 ? ["สุขภาพดี", "normal"] : v >= 50 ? ["สุขภาพปานกลาง", "medium"] : ["สุขภาพต่ำกว่าเกณฑ์", "high"];
  return R(round1(v), label, level, v < 50);
};

// ── Fall Risk ────────────────────────────────────────────────────────────────
export const score_hearing = (a: Answers): ScoringResult => {
  const v = _int(a, "F.hearing");
  if (v === null) return NONE;
  return v === 0 ? R(0, "ปกติ", "normal", false) : R(1, "ผิดปกติ — ควรส่งต่อ", "high", true);
};
export const score_vision = (a: Answers): ScoringResult => {
  const qids = ["F.vision_1", "F.vision_2", "F.vision_3", "F.vision_4", "F.vision_5"];
  const vals = qids.map((q) => _int(a, q)).filter((v): v is number => v !== null);
  if (!vals.length) return NONE;
  const problems = vals.filter((v) => v === 1).length;
  const level: RiskLevel = problems >= 2 ? "high" : problems === 1 ? "medium" : "normal";
  return R(problems, problems ? `ปัญหา ${problems} รายการ` : "ปกติ", level, problems > 0);
};
export const score_frail = (a: Answers): ScoringResult => {
  const total = sumAnswered(a, Array.from({ length: 5 }, (_, i) => `F.frail_${i + 1}`));
  if (total === null) return NONE;
  const [label, level]: [string, RiskLevel] =
    total === 0 ? ["Robust (แข็งแรง)", "normal"] : total <= 2 ? ["Pre-frail (เริ่มเปราะบาง)", "medium"] : ["Frail (เปราะบาง) — ส่งต่อ", "high"];
  return R(total, label, level, total >= 3);
};
export const score_fesi = (a: Answers): ScoringResult => {
  const total = sumAnswered(a, Array.from({ length: 7 }, (_, i) => `F.fesi_${i + 1}`));
  if (total === null) return NONE;
  const [label, level]: [string, RiskLevel] =
    total <= 10 ? ["ความกลัวต่ำ", "normal"] : total <= 16 ? ["ความกลัวปานกลาง", "medium"] : ["ความกลัวสูง — ส่งต่อ", "high"];
  return R(total, label, level, total >= 17);
};
export const score_barthel = (a: Answers): ScoringResult => {
  const total = sumAnswered(a, Array.from({ length: 10 }, (_, i) => `F.barthel_${i + 1}`));
  if (total === null) return NONE;
  let label: string, level: RiskLevel;
  if (total === 100) { label = "อิสระเต็มที่"; level = "normal"; }
  else if (total >= 91) { label = "ต้องการความช่วยเหลือน้อยมาก"; level = "normal"; }
  else if (total >= 61) { label = "ต้องการความช่วยเหลือปานกลาง"; level = "medium"; }
  else if (total >= 21) { label = "ต้องการความช่วยเหลือมาก"; level = "high"; }
  else { label = "พึ่งพาผู้อื่นทั้งหมด"; level = "high"; }
  return R(total, label, level, total <= 90);
};
export const score_liadl = (a: Answers): ScoringResult => {
  const total = sumAnswered(a, Array.from({ length: 8 }, (_, i) => `F.liadl_${i + 1}`));
  if (total === null) return NONE;
  const [label, level]: [string, RiskLevel] =
    total === 8 ? ["อิสระเต็มที่ (8/8)", "normal"] : total >= 6 ? [`ต้องการความช่วยเหลือเล็กน้อย (${total}/8)`, "medium"] : [`ต้องการความช่วยเหลือ (${total}/8)`, "high"];
  return R(total, label, level, total < 8);
};
export const score_environment = (a: Answers): ScoringResult => {
  const total = sumAnswered(a, Array.from({ length: 9 }, (_, i) => `F.env_${i + 1}`));
  if (total === null) return NONE;
  const [label, level]: [string, RiskLevel] =
    total === 0 ? ["สภาพแวดล้อมปลอดภัย", "normal"] : total <= 2 ? [`มีปัจจัยเสี่ยง ${total} รายการ`, "medium"] : [`มีปัจจัยเสี่ยงสูง ${total} รายการ — ปรับสภาพแวดล้อม`, "high"];
  return R(total, label, level, total >= 3);
};
export const score_mini_cog = (a: Answers): ScoringResult => {
  const clock = _int(a, "F.minicog_clock");
  const recall = _int(a, "F.minicog_recall");
  if (clock === null && recall === null) return NONE;
  const total = (clock ?? 0) + (recall ?? 0);
  return total >= 3 ? R(total, "ปกติ", "normal", false) : R(total, "สงสัยสมองเสื่อม — ส่งต่อ MMSE/MoCA", "high", true);
};
export const score_tug = (a: Answers): ScoringResult => {
  const v = _float(a, "F.tug_seconds");
  if (v === null) return NONE;
  const [label, level]: [string, RiskLevel] =
    v <= 10 ? ["ปกติ", "normal"] : v <= 13.5 ? ["เริ่มมีความเสี่ยง", "medium"] : ["เสี่ยงหกล้ม (>13.5 วินาที)", "high"];
  return R(round1(v), label, level, v > 13.5);
};
export const score_sts5 = (a: Answers): ScoringResult => {
  const v = _float(a, "F.sts5_seconds");
  if (v === null) return NONE;
  const [label, level]: [string, RiskLevel] = v <= 12 ? ["กล้ามเนื้อขาแข็งแรง", "normal"] : ["กล้ามเนื้อขาอ่อนแรง (>12 วินาที)", "high"];
  return R(round1(v), label, level, v > 12);
};

// ── BMD ──────────────────────────────────────────────────────────────────────
export const score_frax = (a: Answers): ScoringResult => {
  const v = _int(a, "B.frax_category");
  if (v === null) return NONE;
  const map: Record<number, [string, RiskLevel]> = { 0: ["ปกติ", "normal"], 1: ["เสี่ยง", "medium"], 2: ["เสี่ยงสูง", "high"] };
  const [label, level] = map[v] ?? ["", "normal"];
  return R(v, label, level, v !== 0);
};
export const score_height_change = (a: Answers): ScoringResult => {
  const prev = _float(a, "B.height_prev");
  const curr = _float(a, "G.height_current");
  if (prev === null || curr === null) return NONE;
  const delta = round1(prev - curr);
  const [label, level]: [string, RiskLevel] =
    delta <= 0 ? [`ส่วนสูงไม่ลด (Δ ${pf(delta)} ซม.)`, "normal"] : delta <= 2.0 ? [`ส่วนสูงลด ${pf(delta)} ซม.`, "medium"] : [`ส่วนสูงลดมาก ${pf(delta)} ซม. — เสี่ยงกระดูกพรุน`, "high"];
  return R(delta, label, level, delta > 2.0);
};
export const score_bmd_b1 = (a: Answers): ScoringResult => {
  const v = _int(a, "B.fracture_risk_scale");
  if (v === null) return NONE;
  const [label, level]: [string, RiskLevel] =
    v === 0 ? ["ไม่มีความเสี่ยง", "normal"] : v <= 2 ? [`ความเสี่ยงระดับ ${v}`, "medium"] : [`ความเสี่ยงสูง ระดับ ${v} — ส่งต่อ`, "high"];
  return R(v, label, level, v >= 3);
};
export const score_bmd_b2 = (a: Answers): ScoringResult => {
  const v = _int(a, "B.wound_grade");
  if (v === null) return NONE;
  let label: string, level: RiskLevel;
  if (v === 0) { label = "ไม่มีแผล"; level = "normal"; }
  else if (v === 1) { label = "ระดับ 1 — ผิวหนังแดง"; level = "medium"; }
  else if (v === 2) { label = "ระดับ 2 — มีตุ่มพอง"; level = "high"; }
  else { label = `ระดับ ${v} — แผลลึก — ส่งต่อด่วน`; level = "high"; }
  return R(v, label, level, v >= 1);
};

// ── Nutrition ─────────────────────────────────────────────────────────────────
export const score_oral_health = (a: Answers): ScoringResult => {
  const qids = Array.from({ length: 6 }, (_, i) => `N.oral_${i + 1}`);
  const vals = qids.map((q) => _int(a, q)).filter((v): v is number => v !== null);
  if (!vals.length) return NONE;
  const problems = vals.filter((v) => v === 1).length;
  const level: RiskLevel = problems >= 2 ? "high" : problems === 1 ? "medium" : "normal";
  return R(problems, problems > 0 ? `ปัญหา ${problems} รายการ — ส่งต่อทันตแพทย์` : "ไม่พบปัญหา", level, problems > 0);
};
export const score_mna_sf = (a: Answers): ScoringResult => {
  const v1 = _int(a, "N.mna_1"), v2 = _int(a, "N.mna_2"), v3 = _int(a, "N.mna_3"), v4 = _int(a, "N.mna_4"), v5 = _int(a, "N.mna_5");
  const bmi = _float(a, "G.bmi");
  const v6 = bmi !== null && bmi > 0 ? _int(a, "N.mna_6a") : _int(a, "N.mna_6b");
  const vals = [v1, v2, v3, v4, v5, v6].filter((v): v is number => v !== null);
  if (!vals.length) return NONE;
  const total = vals.reduce((s, x) => s + x, 0);
  const [label, level]: [string, RiskLevel] =
    total >= 12 ? ["โภชนาการปกติ", "normal"] : total >= 8 ? ["เสี่ยงภาวะทุพโภชนาการ", "medium"] : ["ทุพโภชนาการ — ส่งต่อนักโภชนาการ", "high"];
  return R(total, label, level, total <= 11);
};
const TGDS_DEPRESSIVE = new Set([2, 3, 4, 6, 8, 9, 10, 12, 14, 15]);
export const score_tgds15 = (a: Answers): ScoringResult => {
  let total = 0, answered = 0;
  for (let i = 1; i <= 15; i++) {
    const raw = _int(a, `N.tgds_${i}`);
    if (raw === null) continue;
    answered++;
    total += TGDS_DEPRESSIVE.has(i) ? raw : 1 - raw;
  }
  if (answered === 0) return NONE;
  const [label, level]: [string, RiskLevel] =
    total <= 4 ? ["ปกติ", "normal"] : total <= 10 ? ["สงสัยซึมเศร้าเล็กน้อย-ปานกลาง", "medium"] : ["สงสัยซึมเศร้ารุนแรง — ส่งต่อ", "high"];
  return R(total, label, level, total >= 7);
};
export const score_d1_water = (a: Answers): ScoringResult => {
  const v = _float(a, "N.d1_glasses");
  if (v === null) return NONE;
  const [label, level]: [string, RiskLevel] =
    v >= 6 ? [`${v.toFixed(1)} แก้ว/วัน — เพียงพอ`, "normal"] : v >= 4 ? [`${v.toFixed(1)} แก้ว/วัน — ควรเพิ่ม`, "medium"] : [`${v.toFixed(1)} แก้ว/วัน — ไม่เพียงพอ`, "high"];
  return R(round1(v), label, level, v < 4);
};
export const score_d2_diet = (a: Answers): ScoringResult => {
  const total = sumAnswered(a, ["N.d2_variety", "N.d2_regularity", "N.d2_completeness"]);
  if (total === null) return NONE;
  const [label, level]: [string, RiskLevel] =
    total >= 7 ? [`ความหลากหลายดี (${total}/9)`, "normal"] : total >= 4 ? [`ความหลากหลายปานกลาง (${total}/9)`, "medium"] : [`ความหลากหลายน้อย (${total}/9)`, "high"];
  return R(total, label, level, total < 4);
};
export const score_d3_portion = (a: Answers, prev?: Answers | null): ScoringResult => {
  const current = _int(a, "N.d3_current");
  if (current === null) return NONE;
  let flag = false, level: RiskLevel = "normal";
  const parts = [`ปัจจุบัน: ${current}/5`];
  if (prev) {
    const prevVal = _int(prev, "N.d3_current");
    if (prevVal !== null) {
      const diff = current - prevVal;
      if (diff <= -2) { flag = true; level = "high"; parts.push(`ลดลงจากครั้งก่อน ${Math.abs(diff)} คะแนน — เฝ้าระวัง`); }
      else if (diff < 0) { level = "medium"; parts.push(`ลดลงเล็กน้อย ${Math.abs(diff)} คะแนน`); }
    }
  }
  if (current <= 2) { level = "high"; flag = true; parts.push("ปริมาณน้อยมาก"); }
  return R(current, parts.join(" / "), level, flag);
};
export const score_d4_meals = (a: Answers): ScoringResult => {
  const v = _int(a, "N.d4_meals");
  if (v === null) return NONE;
  const [label, level]: [string, RiskLevel] =
    v === 3 ? ["3 มื้อ/วัน — เหมาะสม", "normal"] : v === 2 ? ["2 มื้อ/วัน — ควรเพิ่ม", "medium"] : ["1 มื้อ/วัน — ไม่เพียงพอ", "high"];
  return R(v, label, level, v < 3);
};

// ── Dispatcher ────────────────────────────────────────────────────────────────
export const TOOL_SCORERS: Record<string, (a: Answers, prev?: Answers | null) => ScoringResult> = {
  AAI: score_aai, EQ5D: score_eq5d, EQ_VAS: score_eq_vas, HEARING: score_hearing, VISION: score_vision,
  FRAIL: score_frail, FES_I: score_fesi, BARTHEL: score_barthel, LIADL: score_liadl, ENVIRONMENT: score_environment,
  MINI_COG: score_mini_cog, TUG: score_tug, STS5: score_sts5,
  BMD_FRAX: score_frax, BMD_HEIGHT: score_height_change, BMD_B1: score_bmd_b1, BMD_B2: score_bmd_b2,
  ORAL_HEALTH: score_oral_health, MNA_SF: score_mna_sf, TGDS_15: score_tgds15,
  D1_WATER: score_d1_water, D2_DIET: score_d2_diet, D3_PORTION: score_d3_portion, D4_MEALS: score_d4_meals,
};

export const PROJECT_TOOLS: Record<string, string[]> = {
  general: ["AAI", "EQ5D", "EQ_VAS", "HEARING", "VISION"],
  fall: ["FRAIL", "FES_I", "BARTHEL", "LIADL", "ENVIRONMENT", "MINI_COG", "TUG", "STS5"],
  bmd: ["BMD_FRAX", "BMD_HEIGHT", "BMD_B1", "BMD_B2"],
  nutrition: ["ORAL_HEALTH", "MNA_SF", "TGDS_15", "D1_WATER", "D2_DIET", "D3_PORTION", "D4_MEALS"],
};

export interface ToolScoreRow { toolCode: string; result: ScoringResult }

/** Run every tool scorer over the answers (D3 uses `prev` for the cross-visit delta). Exceptions → NONE. */
export function computeAllScores(answers: Answers, prev?: Answers | null): ToolScoreRow[] {
  return Object.entries(TOOL_SCORERS).map(([toolCode, scorer]) => {
    let result: ScoringResult;
    try {
      result = toolCode === "D3_PORTION" ? scorer(answers, prev) : scorer(answers);
    } catch {
      result = NONE;
    }
    return { toolCode, result };
  });
}

/** Per-project (module) risk = the max risk across that project's answered tools. */
export function getProjectRiskSummary(scores: ToolScoreRow[]): Record<string, RiskLevel> {
  const rank: Record<string, number> = { high: 2, medium: 1, low: 0, normal: 0 };
  const out: Record<string, RiskLevel> = {};
  for (const [project, tools] of Object.entries(PROJECT_TOOLS)) {
    const levels = scores
      .filter((s) => tools.includes(s.toolCode) && s.result.rawScore !== null)
      .map((s) => s.result.riskLevel || "normal");
    const max = levels.length ? Math.max(...levels.map((l) => rank[l] ?? 0)) : 0;
    out[project] = max >= 2 ? "high" : max === 1 ? "medium" : "normal";
  }
  return out;
}
