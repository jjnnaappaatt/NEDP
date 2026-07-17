/**
 * Bridge from a clinical questionnaire's answers to the AAI derived path. The SQL trigger
 * (fn_score_person_assessment → aai_derive_indicators) stays the sole owner of AAI derivation; we feed it
 * a `raw_answers` object with the exact keys it reads — the same contract `lib/factPersons.toRawAnswers`
 * satisfies — so the AAI computes identically whether a person came via the flat factPersons template or
 * the NEDP questionnaire.
 *
 * NOTE (future): the earmarked model for imported-questionnaire AAI is the dormant Thai-Adapted
 * 19-indicator spec in `lib/aai/thaiAdapted19.ts` (30/15/30/25 · 19 · base 64.6). It is reference-only
 * today — wired into nothing — pending the D1 age-band / home_ownership / life-expectancy-at-60
 * decisions; this bridge still feeds the live 22-indicator SQL scorer.
 */
import type { Answers, ToolScoreRow } from "./scoring";

/** Recompute G.bmi from weight+height (1 dp) exactly like routes.py:260, returning a COPY of the answers
 *  with G.bmi set (so score_mna_sf's BMI-vs-CC branch is correct). Never trusts a client-sent BMI. */
export function applyBmi(answers: Answers): Answers {
  const out = { ...answers };
  const w = Number(answers["G.weight"]);
  const h = Number(answers["G.height_current"]);
  if (Number.isFinite(w) && Number.isFinite(h) && h > 0) {
    out["G.bmi"] = Math.round((w / (h / 100) ** 2) * 10) / 10;
  } else {
    delete out["G.bmi"]; // empty → MNA uses the calf-circumference item (6b)
  }
  return out;
}

const toolTotal = (scores: ToolScoreRow[], code: string): number | null =>
  scores.find((s) => s.toolCode === code)?.result.rawScore ?? null;

/**
 * Build the `person_assessments.raw_answers` object the SQL AAI scorer + trigger read:
 * - AAI general questions `aai_q2..q7` ← `G.aai_q2..q7`
 * - demographics `age/education/occupation` ← `G.age/G.education/G.occupation` (NEDP uses 0–3 scales,
 *   matching the derive's `/3` — see M2 §R4)
 * - tool totals the trigger copies into `tool_*` + reads for indicators: barthel, environment, tgds,
 *   frail, mna, minicog, fes_i, l_iadl, eq_vas.
 */
export function toDerivedRawAnswers(answers: Answers, scores: ToolScoreRow[]): Record<string, string> {
  const raw: Record<string, string> = {};
  const put = (k: string, v: unknown) => {
    if (v !== null && v !== undefined && String(v).trim() !== "") raw[k] = String(v);
  };
  for (const q of ["aai_q2", "aai_q3", "aai_q4", "aai_q5", "aai_q6", "aai_q7"]) put(q, answers[`G.${q}`]);
  put("age", answers["G.age"]);
  put("education", answers["G.education"]);
  put("occupation", answers["G.occupation"]);
  put("barthel", toolTotal(scores, "BARTHEL"));
  put("environment", toolTotal(scores, "ENVIRONMENT"));
  put("tgds", toolTotal(scores, "TGDS_15"));
  put("frail", toolTotal(scores, "FRAIL"));
  put("mna", toolTotal(scores, "MNA_SF"));
  put("minicog", toolTotal(scores, "MINI_COG"));
  put("fes_i", toolTotal(scores, "FES_I"));
  put("l_iadl", toolTotal(scores, "LIADL"));
  put("eq_vas", toolTotal(scores, "EQ_VAS"));
  return raw;
}
