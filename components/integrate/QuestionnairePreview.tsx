"use client";

import { useMemo } from "react";
import { QuestionnaireForm } from "@/components/questionnaire/QuestionnaireForm";
import { validateRawSurvey, surveyQuestionsToSchema, type RawSurvey } from "@/lib/questionnaire/surveyCore";

const noop = () => {};

/** Live preview of a custom questionnaire, rendered as the REAL form (interactive, no submit), driven by
 *  the JSON a user is typing/pasting. Invalid or empty JSON shows a friendly hint instead of crashing.
 *  The AAI section (needs nedp) isn't rendered — a caption notes it's auto-added on approval. */
export function QuestionnairePreview({ json, includeAai }: { json: string; includeAai?: boolean }) {
  const state = useMemo(() => {
    const t = json.trim();
    if (!t) return { kind: "empty" as const };
    let raw: unknown;
    try { raw = JSON.parse(t); } catch { return { kind: "error" as const, msg: "JSON ไม่ถูกต้อง" }; }
    const err = validateRawSurvey(raw);
    if (err) return { kind: "error" as const, msg: err };
    return { kind: "ok" as const, schema: surveyQuestionsToSchema(raw as RawSurvey) };
  }, [json]);

  return (
    <div className="rounded-card border border-border bg-surface-soft/30 p-3">
      <div className="mb-2 text-xs font-semibold text-ink-soft">ตัวอย่างแบบสอบถามจริง (พรีวิว)</div>
      {state.kind === "empty" && <p className="text-sm text-ink-muted">วาง/แก้ไข JSON ด้านบนเพื่อดูตัวอย่างแบบสอบถามจริง</p>}
      {state.kind === "error" && <p className="text-sm text-warning-fg">⚠ {state.msg}</p>}
      {state.kind === "ok" && (
        <div className="space-y-2">
          <QuestionnaireForm schema={state.schema} modules={[]} preview onSubmit={noop} />
          {includeAai && <p className="text-xs text-ink-muted">+ ส่วน “ข้อมูลทั่วไป (AAI)” จะถูกเพิ่มให้อัตโนมัติเมื่ออนุมัติ</p>}
        </div>
      )}
    </div>
  );
}
