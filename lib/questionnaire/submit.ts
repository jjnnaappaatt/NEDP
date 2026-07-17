/**
 * Server-side bridge: answers → { AAI raw_answers, per-tool scores, per-project risk }. Shared by the
 * in-app form submit route and the Excel upload route so both produce identical scoring. BMI is
 * recomputed here (never trusted from the client).
 */
import { applyBmi, toDerivedRawAnswers } from "./derive";
import { computeAllScores, getProjectRiskSummary, PROJECT_TOOLS, type Answers, type RiskLevel } from "./scoring";
import { computeSurveyScores } from "./surveyScoring";
import type { QuestionnaireSchema } from "./schema";
import type { ClinicalToolScoreIn } from "@/lib/data/sb/questionnaire";

const TOOL_MODULE: Record<string, string> = {};
for (const [mod, tools] of Object.entries(PROJECT_TOOLS)) for (const t of tools) TOOL_MODULE[t] = mod;

export interface BuiltClinical {
  rawAnswers: Record<string, string>;
  toolScores: ClinicalToolScoreIn[];
  riskSummary: Record<string, RiskLevel>;
}

export function buildClinical(answers: Answers, prev?: Answers | null, schema?: QuestionnaireSchema | null): BuiltClinical {
  const withBmi = applyBmi(answers);
  const scores = computeAllScores(withBmi, prev);
  const clinical: ClinicalToolScoreIn[] = scores
    .filter((s) => s.result.rawScore !== null)
    .map((s) => ({
      tool_code: s.toolCode,
      project_module: TOOL_MODULE[s.toolCode] ?? "general",
      raw_score: s.result.rawScore,
      score_label: s.result.scoreLabel,
      risk_level: s.result.riskLevel,
      flag: s.result.flag,
    }));
  const survey = schema?.scores?.length ? computeSurveyScores(schema, withBmi) : [];
  return {
    rawAnswers: toDerivedRawAnswers(withBmi, scores),
    riskSummary: getProjectRiskSummary(scores),
    toolScores: [...clinical, ...survey],
  };
}
