/**
 * Client-safe core of the custom-survey format: the raw-import types, validation, and the
 * questions → QuestionnaireSchema mapping — WITHOUT the AAI general section (which needs the 41KB
 * nedp.v1.json). Importable from client components (the live preview) and the server (surveys.ts
 * re-exports these + adds the AAI section). Imports only types from ./schema.
 */
import type { QuestionnaireSchema, QSection, Question, QType, SurveyScoreDef } from "./schema";

export interface RawSurveyQuestion {
  id: number | string;
  text: string;
  type?: string; // scale_5 | radio | checkbox_multi | number | (undefined = radio)
  options?: { value: number | string; label: string }[];
  min?: number;
  max?: number;
}
/** A researcher-declared specific score in the raw import format. `questions`/`reverse` reference the
 *  raw question `id`s; the converter namespaces them to `S.q<id>`. */
export interface RawSurveyScore {
  key: string;
  label: string;
  questions: (number | string)[];
  agg: "mean" | "sum";
  min?: number;
  max?: number;
  reverse?: (number | string)[];
}
export interface RawSurvey {
  title?: string;
  scale_note?: string;
  questions: RawSurveyQuestion[];
  scores?: RawSurveyScore[];
}

export const mapType = (t?: string): QType => (t === "number" ? "number" : t === "checkbox_multi" ? "checkbox_multi" : "radio");

/** Validate the imported shape; returns an error message or null. */
export function validateRawSurvey(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return "ต้องเป็น JSON แบบ object";
  const r = raw as RawSurvey;
  if (!Array.isArray(r.questions) || r.questions.length === 0) return "ต้องมี questions เป็น array อย่างน้อย 1 ข้อ";
  for (const [i, q] of r.questions.entries()) {
    if (!q || typeof q.text !== "string" || !q.text.trim()) return `ข้อที่ ${i + 1}: ต้องมี text`;
    const type = mapType(q.type);
    if ((type === "radio" || type === "checkbox_multi") && (!Array.isArray(q.options) || q.options.length === 0))
      return `ข้อที่ ${i + 1} (${q.text.slice(0, 20)}…): ต้องมี options`;
  }
  if (r.scores != null) {
    if (!Array.isArray(r.scores)) return "scores ต้องเป็น array";
    const ids = new Set(r.questions.map((q) => String(q.id)));
    for (const [i, s] of r.scores.entries()) {
      const at = `คะแนนที่ ${i + 1}`;
      if (!s || typeof s.key !== "string" || !s.key.trim()) return `${at}: ต้องมี key`;
      if (typeof s.label !== "string" || !s.label.trim()) return `คะแนน ${s.key}: ต้องมี label`;
      if (!Array.isArray(s.questions) || s.questions.length === 0) return `คะแนน ${s.key}: ต้องระบุ questions`;
      if (s.agg !== "mean" && s.agg !== "sum") return `คะแนน ${s.key}: agg ต้องเป็น "mean" หรือ "sum"`;
      for (const qid of s.questions) if (!ids.has(String(qid))) return `คะแนน ${s.key}: อ้างถึงข้อ ${qid} ที่ไม่มีอยู่`;
      if (s.reverse?.length) {
        // reverse needs min/max to flip within — otherwise the flip silently no-ops (see computeSurveyScores).
        if (typeof s.min !== "number" || typeof s.max !== "number" || s.min >= s.max)
          return `คะแนน ${s.key}: การกลับคะแนน (reverse) ต้องระบุ min/max เป็นตัวเลข และ min < max`;
        const grp = new Set(s.questions.map(String));
        for (const qid of s.reverse) if (!grp.has(String(qid))) return `คะแนน ${s.key}: reverse ต้องอยู่ในรายการ questions ของคะแนนนี้`;
      }
    }
  }
  return null;
}

/** Raw survey → schema WITHOUT the AAI section: the survey section (questions) + declared scores only.
 *  surveys.ts::surveyToSchema builds on this and prepends AAI_GENERAL_SECTION when includeAai. */
export function surveyQuestionsToSchema(raw: RawSurvey): QuestionnaireSchema {
  const questions: Question[] = (raw.questions ?? []).map((q) => {
    const type = mapType(q.type);
    const out: Question = { id: `S.q${q.id}`, label: q.text, type, required: false };
    if (type === "radio" || type === "checkbox_multi") out.options = (q.options ?? []).map((o) => ({ value: o.value, label: o.label }));
    if (type === "number") { if (q.min != null) out.min = q.min; if (q.max != null) out.max = q.max; }
    return out;
  });
  const surveySection: QSection = { id: "survey", label: raw.title || "แบบสอบถามของโครงการ", color: "#1A7A2A", module: "survey", questions };
  const qid = (id: number | string) => `S.q${id}`;
  const scores: SurveyScoreDef[] = (raw.scores ?? []).map((s) => ({
    key: `SC.${s.key}`,                          // namespaced → never collides with a built-in tool code
    label: s.label,
    questions: s.questions.map(qid),
    agg: s.agg === "sum" ? "sum" : "mean",
    ...(s.min != null ? { min: s.min } : {}),
    ...(s.max != null ? { max: s.max } : {}),
    ...(s.reverse?.length ? { reverse: s.reverse.map(qid) } : {}),
  }));
  return {
    version: "v1.0",
    kind: "survey",
    sections: [surveySection],
    tools: {},
    ...(scores.length ? { scores } : {}),
  };
}
