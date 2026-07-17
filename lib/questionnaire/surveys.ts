/**
 * Server-side survey→schema converter: builds on the client-safe `surveyCore` and prepends the
 * AAI/ข้อมูลทั่วไป section (extracted from nedp.v1.json) when includeAai — so the AAI still derives; the
 * survey's own questions are captured in q_answers. Re-exports the raw-import types + validateRawSurvey
 * from surveyCore for existing importers. Server-side only (imports the 41KB nedp.v1.json); the client
 * live-preview imports surveyCore directly.
 */
import nedpRaw from "./nedp.v1.json";
import type { QuestionnaireSchema, QSection } from "./schema";
import { surveyQuestionsToSchema, type RawSurvey } from "./surveyCore";

export { validateRawSurvey, mapType, surveyQuestionsToSchema } from "./surveyCore";
export type { RawSurvey, RawSurveyQuestion, RawSurveyScore } from "./surveyCore";

/** Reusable "shared AAI section" = the AAI-relevant subset of NEDP's general section (no clinical vitals),
 *  extracted from the source so it can't drift. Provides G.age/education/occupation + G.aai_q1..q8 that
 *  the AAI deriver reads. */
const AAI_IDS = new Set([
  "G.sex", "G.age", "G.education", "G.occupation", "G.has_disease",
  "G.aai_q1", "G.aai_q2", "G.aai_q3", "G.aai_q4", "G.aai_q5", "G.aai_q6", "G.aai_q7", "G.aai_q8",
]);
const nedpGeneral = (nedpRaw.sections as unknown as QSection[]).find((s) => s.id === "general");
export const AAI_GENERAL_SECTION: QSection = {
  id: "general",
  label: "◎ ข้อมูลทั่วไป (สำหรับคำนวณ AAI)",
  color: "#1E3A5F",
  module: "general",
  questions: (nedpGeneral?.questions ?? []).filter((q) => AAI_IDS.has(q.id)),
};

/** Raw survey JSON → QuestionnaireSchema, optionally prepending the shared AAI section so the AAI derives. */
export function surveyToSchema(raw: RawSurvey, opts: { includeAai?: boolean } = {}): QuestionnaireSchema {
  const base = surveyQuestionsToSchema(raw);
  return { ...base, sections: opts.includeAai ? [AAI_GENERAL_SECTION, ...base.sections] : base.sections };
}
