/**
 * Schema-driven scoring for custom per-project questionnaires (Part C). Unlike the hardcoded clinical
 * `TOOL_SCORERS` (scoring.ts), these "specific scores" are declared by the researcher in the questionnaire
 * itself (`schema.scores`) and computed generically as a mean/sum of a question group. Each becomes a
 * `project_module:"survey"` tool score stored next to AAI — collected, not risk-flagged.
 */
import type { QuestionnaireSchema } from "./schema";
import type { Answers } from "./scoring";

/** Structurally identical to lib/data/sb/questionnaire ClinicalToolScoreIn — kept local so this module
 *  (imported by client components for surveyScoreLabels) never pulls a server-only import. */
export type SurveyToolScore = {
  tool_code: string; project_module: string; raw_score: number | null; score_label: string; risk_level: string; flag: boolean;
};

const num = (a: Answers, qid: string): number | null => {
  const v = a[qid];
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const pf = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1));

/** Compute every declared specific score from the answers. Scores with no answered questions are skipped
 *  (no row emitted). Reverse-scored questions flip within [min,max] when both bounds are given. */
export function computeSurveyScores(schema: QuestionnaireSchema, answers: Answers): SurveyToolScore[] {
  const out: SurveyToolScore[] = [];
  for (const def of schema.scores ?? []) {
    const canReverse = def.min != null && def.max != null && (def.reverse?.length ?? 0) > 0;
    const rev = new Set(def.reverse ?? []);
    const vals: number[] = [];
    for (const qid of def.questions) {
      let v = num(answers, qid);
      if (v === null) continue;
      if (canReverse && rev.has(qid)) v = (def.min as number) + (def.max as number) - v;
      vals.push(v);
    }
    if (vals.length === 0) continue;
    const sum = vals.reduce((s, x) => s + x, 0);
    const mean = sum / vals.length;
    const raw = def.agg === "sum" ? sum : Math.round(mean * 10) / 10;
    const scoreLabel = def.agg === "sum"
      ? `รวม ${pf(sum)} · จาก ${vals.length} ข้อ`
      : `เฉลี่ย ${pf(raw)}${def.max != null ? ` / ${def.max}` : ""} · จาก ${vals.length} ข้อ`;
    out.push({
      tool_code: def.key, project_module: "survey",
      raw_score: raw, score_label: scoreLabel, risk_level: "normal", flag: false,
    });
  }
  return out;
}

/** {key → label} map for rendering custom score codes (which aren't in the fixed TOOL_LABEL). */
export function surveyScoreLabels(schema: QuestionnaireSchema | null | undefined): Record<string, string> {
  const m: Record<string, string> = {};
  for (const s of schema?.scores ?? []) m[s.key] = s.label;
  return m;
}
