/**
 * Questionnaire schema — the TS port of the legacy NEDP `V1_SCHEMA` shape (aai_mvp/nedp/models.py).
 * A questionnaire is a data-driven definition of sections → questions (+ a tools map for clinical ones).
 * The same schema drives the in-app form renderer, the per-project Excel template, validation, and
 * (for `kind:"clinical"`) the tool scorers in `./scoring.ts`.
 */

export type QType = "number" | "derived" | "radio" | "checkbox_multi" | "text";

export interface QOption {
  value: string | number;
  label: string;
}

/** A radio/number option list holds QOption[]; a checkbox_multi list holds plain strings. */
export type QOptions = (QOption | string)[];

/** Conditional visibility: show only when the referenced question equals `value`, or is (not) empty. */
export type QShowIf =
  | { question: string; value: string | number }
  | { question: string; not_empty: true }
  | { question: string; empty: true };

export interface Question {
  id: string;
  label: string;
  type: QType;
  options?: QOptions;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  show_if?: QShowIf;
  prefill_from_patient?: "sex" | "age" | "education" | "occupation";
  derived_from?: string[];
  tool?: string;
}

export interface QSection {
  id: string;
  label: string;
  color?: string;
  /** general | fall | bmd | nutrition | survey — the assignment's `modules` select which render/score. */
  module: string;
  questions: Question[];
}

export interface ToolDef {
  questions: string[];
  project: string;
}

/** A researcher-declared "specific score" computed from a survey's own questions (mean/sum of a
 *  question group), stored alongside AAI as a `project_module:"survey"` tool score. `min`/`max` are
 *  the per-question value range (used for reverse-scoring and interpretation); `reverse` lists the
 *  question ids scored in the opposite direction. */
export interface SurveyScoreDef {
  key: string;
  label: string;
  questions: string[];
  agg: "mean" | "sum";
  min?: number;
  max?: number;
  reverse?: string[];
}

export interface QuestionnaireSchema {
  version: string;
  kind: "clinical" | "survey";
  sections: QSection[];
  tools: Record<string, ToolDef>;
  /** Survey questionnaires only: declared specific-score groups (Part C). */
  scores?: SurveyScoreDef[];
}

export function isQOption(o: QOption | string): o is QOption {
  return typeof o === "object" && o !== null && "value" in o;
}

/** Flat map of every question by id (across all sections). */
export function questionMap(schema: QuestionnaireSchema): Map<string, Question> {
  const m = new Map<string, Question>();
  for (const s of schema.sections) for (const q of s.questions) m.set(q.id, q);
  return m;
}

/** All question ids referenced anywhere in the schema that MUST resolve to a real question. */
export function referencedIds(schema: QuestionnaireSchema): { from: string; id: string }[] {
  const refs: { from: string; id: string }[] = [];
  for (const s of schema.sections) {
    for (const q of s.questions) {
      if (q.show_if) refs.push({ from: `${q.id}.show_if`, id: q.show_if.question });
      for (const d of q.derived_from ?? []) refs.push({ from: `${q.id}.derived_from`, id: d });
    }
  }
  for (const [code, def] of Object.entries(schema.tools)) {
    for (const qid of def.questions) refs.push({ from: `tool ${code}`, id: qid });
  }
  for (const s of schema.scores ?? []) {
    for (const qid of s.questions) refs.push({ from: `score ${s.key}`, id: qid });
  }
  return refs;
}
