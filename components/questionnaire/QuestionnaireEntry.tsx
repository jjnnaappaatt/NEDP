"use client";

import { useState } from "react";
import { IconCircleCheck } from "@tabler/icons-react";
import { QuestionnaireForm, type PrefillPerson } from "./QuestionnaireForm";
import { PersonToolScores, type ToolScoreView } from "@/components/portal/PersonToolScores";
import { surveyScoreLabels } from "@/lib/questionnaire/surveyScoring";
import type { QuestionnaireSchema } from "@/lib/questionnaire/schema";

type SubmitResult = {
  ok?: boolean; error?: string; overall?: number | null;
  riskSummary?: Record<string, string>;
  toolScores?: { tool_code: string; project_module: string; score_label: string; risk_level: string; flag: boolean }[];
};

const errMsg = (e?: string) =>
  e === "not_contact" ? "ต้องเป็นผู้รับผิดชอบโครงการ"
    : e === "no_questionnaire" ? "โครงการนี้ยังไม่ได้กำหนดแบบสอบถาม" : "บันทึกไม่สำเร็จ";

export function QuestionnaireEntry({ projectId, personId, personCode, schema, modules, canEdit, prefill, onSaved }: {
  projectId: string; personId: string; personCode: string;
  schema: QuestionnaireSchema; modules: string[]; canEdit: boolean; prefill?: PrefillPerson;
  /** Called after a successful submit (e.g. so a parent sheet can reload the person's AAI). */
  onSaved?: (overall: number | null) => void;
}) {
  const [round, setRound] = useState<"pre" | "post">("pre");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const submit = async (answers: Record<string, string | string[]>) => {
    setBusy(true); setResult(null);
    try {
      const res = await fetch("/api/questionnaire/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, personId, round, answers }),
      });
      const d = (await res.json().catch(() => ({}))) as SubmitResult;
      setResult(d.ok ? d : { error: d.error });
      if (d.ok) onSaved?.(d.overall ?? null);
    } finally { setBusy(false); }
  };

  const view: ToolScoreView[] = (result?.toolScores ?? []).map((s) => ({
    toolCode: s.tool_code, projectModule: s.project_module, scoreLabel: s.score_label, riskLevel: s.risk_level, flag: s.flag,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-ink-soft">รอบการประเมิน:</span>
        {(["pre", "post"] as const).map((r) => (
          <button key={r} onClick={() => setRound(r)}
            className={`rounded-card border px-3 py-1.5 ${round === r ? "border-accent bg-accent-soft font-semibold text-ink" : "border-border text-ink-soft"}`}>
            {r === "pre" ? "ก่อน (baseline)" : "หลัง"}
          </button>
        ))}
      </div>

      {result?.ok ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-card border border-success/40 bg-success-bg/40 p-3 text-sm text-success-fg">
            <IconCircleCheck size={20} /> บันทึกแบบสอบถามของ {personCode} แล้ว
            {result.overall != null && <span className="ml-1 text-ink-soft">· คะแนน AAI รวม {result.overall}</span>}
          </div>
          {result.overall == null && (
            <div className="rounded-card border border-warning/40 bg-warning-bg/40 p-3 text-sm text-warning-fg">
              ⚠ ยังคำนวณ AAI ไม่ได้ (ข้อมูลไม่ครบ) — บันทึกแล้วแต่ยังไม่นับว่าเสร็จสมบูรณ์ โปรดตรวจสอบคำตอบส่วนข้อมูลทั่วไป (อายุ/อาชีพ/AAI Q1–Q8)
            </div>
          )}
          <PersonToolScores scores={view} riskSummary={result.riskSummary} labelOverrides={surveyScoreLabels(schema)} />
          <button onClick={() => setResult(null)} className="rounded-card border border-border px-4 py-2 text-sm text-ink-soft hover:bg-surface">
            กรอกรอบใหม่ / แก้ไข
          </button>
        </div>
      ) : (
        <>
          {result?.error && <p className="text-sm text-warning-fg">{errMsg(result.error)}</p>}
          {!canEdit && <div className="rounded-card border border-warning/40 bg-warning-bg p-2.5 text-xs text-warning-fg">ต้องเป็นผู้รับผิดชอบโครงการจึงจะบันทึกได้</div>}
          <QuestionnaireForm schema={schema} modules={modules} person={prefill} busy={busy} onSubmit={submit} />
        </>
      )}
    </div>
  );
}
