"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { isQOption, type QuestionnaireSchema, type Question, type QSection } from "@/lib/questionnaire/schema";

type Value = string | string[];
type Answers = Record<string, Value>;

const fieldCls =
  "w-full min-h-[44px] rounded-card border border-border bg-surface px-3 text-base text-ink outline-none focus:border-accent";

/** Is `v` non-empty (string or non-empty array). */
const filled = (v: Value | undefined): boolean =>
  Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim() !== "";

export interface PrefillPerson { sex?: string | null; age?: number | null; education?: number | null; occupation?: number | null }

/**
 * Renders a clinical/survey questionnaire schema (sections filtered to the assigned `modules` + general),
 * honoring radio/number/checkbox_multi/text/derived, `show_if` gating, prefill, and min/max. Read-only
 * `derived` fields (G.bmi) compute live. `onSubmit` receives the visible answers (derived included).
 */
export function QuestionnaireForm({ schema, modules, person, busy, onSubmit, preview }: {
  schema: QuestionnaireSchema;
  modules: string[];
  person?: PrefillPerson;
  busy?: boolean;
  onSubmit: (answers: Answers) => void;
  /** Live-preview mode: render the real fields (interactive) but hide the progress + submit bars. */
  preview?: boolean;
}) {
  const sections = useMemo<QSection[]>(
    () => schema.sections.filter((s) => modules.length === 0 || s.module === "general" || modules.includes(s.module)),
    [schema.sections, modules],
  );
  const [answers, setAnswers] = useState<Answers>(() => {
    const a: Answers = {};
    if (person) {
      if (person.sex != null) a["G.sex"] = person.sex === "F" ? "1" : person.sex === "M" ? "0" : "";
      if (person.age != null) a["G.age"] = String(person.age);
      if (person.education != null) a["G.education"] = String(person.education);
      if (person.occupation != null) a["G.occupation"] = String(person.occupation);
    }
    return a;
  });
  const [tried, setTried] = useState(false);

  const set = (id: string, v: Value) => setAnswers((p) => ({ ...p, [id]: v }));

  const bmi = useMemo(() => {
    const w = Number(answers["G.weight"]);
    const h = Number(answers["G.height_current"]);
    return Number.isFinite(w) && Number.isFinite(h) && h > 0 ? Math.round((w / (h / 100) ** 2) * 10) / 10 : null;
  }, [answers]);

  const derivedValue = (q: Question): string => (q.id === "G.bmi" ? (bmi == null ? "" : String(bmi)) : "");

  const visible = (q: Question): boolean => {
    const c = q.show_if;
    if (!c) return true;
    if (q.id === "N.mna_6a" || q.id === "N.mna_6b" || (c.question === "G.bmi")) {
      // BMI-driven MNA branch: compute from vitals, not a stored answer
      const has = bmi != null;
      if ("not_empty" in c) return has;
      if ("empty" in c) return !has;
    }
    const cur = answers[c.question];
    if ("not_empty" in c) return filled(cur);
    if ("empty" in c) return !filled(cur);
    return typeof cur === "string" && cur === String(c.value);
  };

  const visibleQs = sections.flatMap((s) => s.questions.filter(visible));
  const requiredMissing = visibleQs.filter((q) => q.required && q.type !== "derived" && !filled(answers[q.id]));
  const requiredTotal = visibleQs.filter((q) => q.required && q.type !== "derived").length;

  const submit = () => {
    setTried(true);
    if (requiredMissing.length) return;
    const out: Answers = {};
    for (const q of visibleQs) {
      if (q.type === "derived") { const v = derivedValue(q); if (v) out[q.id] = v; }
      else if (filled(answers[q.id])) out[q.id] = answers[q.id];
    }
    onSubmit(out);
  };

  return (
    <div className={cn("space-y-4", !preview && "pb-40 sm:pb-6")}>
      {!preview && (
        <div className="sticky top-0 z-10 rounded-card bg-surface/90 px-1 py-1 text-xs text-ink-soft backdrop-blur">
          ตอบครบที่จำเป็นแล้ว {requiredTotal - requiredMissing.length}/{requiredTotal}
        </div>
      )}
      {sections.map((s) => {
        const qs = s.questions.filter(visible);
        if (!qs.length) return null;
        return (
          <div key={s.id} className="space-y-4 rounded-card border border-border bg-surface p-4">
            <h3 className="border-l-4 pl-2 font-display text-base font-semibold text-ink" style={{ borderColor: s.color ?? "var(--accent)" }}>
              {s.label}
            </h3>
            {qs.map((q) => (
              <Field key={q.id} q={q} value={q.type === "derived" ? derivedValue(q) : (answers[q.id] ?? "")}
                error={tried && !!q.required && q.type !== "derived" && !filled(answers[q.id])}
                onChange={(v) => set(q.id, v)} />
            ))}
          </div>
        );
      })}
      {!preview && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <div className="mx-auto max-w-content">
            <button disabled={busy} onClick={submit}
              className="w-full rounded-card bg-hero px-5 py-3 text-base font-semibold text-[var(--on-primary)] transition disabled:opacity-50">
              {busy ? "กำลังบันทึก…" : "บันทึกแบบสอบถาม + คำนวณคะแนน"}
            </button>
            {tried && requiredMissing.length > 0 && (
              <p className="mt-2 text-center text-sm text-warning-fg">กรุณากรอกช่องที่จำเป็น ({requiredMissing.length} ช่อง)</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ q, value, error, onChange }: { q: Question; value: Value; error: boolean; onChange: (v: Value) => void }) {
  const label = (
    <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-ink">
      <span>{q.label}</span>
      {q.required && <span className="text-warning-fg">*</span>}
    </label>
  );
  if (q.type === "derived") {
    return <div>{label}<div className={cn(fieldCls, "flex items-center bg-surface-soft/60 text-ink-soft")}>{value || "—"}</div></div>;
  }
  if (q.type === "radio") {
    const opts = (q.options ?? []).filter(isQOption);
    return (
      <div>{label}
        <div className="flex flex-wrap gap-2">
          {opts.map((o) => {
            const on = value === String(o.value);
            return (
              <button key={String(o.value)} type="button" onClick={() => onChange(String(o.value))}
                className={cn("rounded-card border px-3 py-2 text-sm transition",
                  on ? "border-accent bg-accent-soft font-semibold text-ink" : "border-border text-ink-soft hover:bg-surface-soft",
                  error && !on && "border-warning/50")}>
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (q.type === "checkbox_multi") {
    const arr = Array.isArray(value) ? value : [];
    const opts = (q.options ?? []).map((o) => (isQOption(o) ? o.label : o));
    return (
      <div>{label}
        <div className="flex flex-wrap gap-2">
          {opts.map((o) => {
            const on = arr.includes(o);
            return (
              <button key={o} type="button" onClick={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])}
                className={cn("rounded-card border px-3 py-2 text-sm transition", on ? "border-accent bg-accent-soft font-semibold text-ink" : "border-border text-ink-soft hover:bg-surface-soft")}>
                {o}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div>{label}
      <input type={q.type === "number" ? "number" : "text"} inputMode={q.type === "number" ? "decimal" : undefined}
        min={q.min} max={q.max} step={q.step} value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        className={cn(fieldCls, error && "border-warning focus:border-warning")} />
    </div>
  );
}
