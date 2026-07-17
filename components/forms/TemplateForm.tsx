"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/forms/ProgressBar";
import { IconCircleCheck, IconUpload } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { ProjectTemplate, TemplateField } from "@/types";

type Values = Record<string, string>;
type Touched = Record<string, boolean>;

function isFilled(v: string | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

const baseField =
  "w-full min-h-[44px] rounded-card border border-border bg-surface px-3 text-base text-ink " +
  "placeholder:text-ink-muted outline-none transition focus:border-border-accent " +
  "focus:ring-2 focus:ring-border-accent/30";

export function TemplateForm({
  template,
  onSubmitted,
  submitLabel = "ส่งข้อมูล",
}: {
  template: ProjectTemplate;
  /** When provided (e.g. per-location flow), called on a valid submit (with the field values)
   *  instead of the standalone success card. */
  onSubmitted?: (values: Values) => void;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<Values>({});
  const [touched, setTouched] = useState<Touched>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const requiredFields = useMemo(
    () => template.fields.filter((f) => f.required),
    [template.fields],
  );
  const totalRequired = requiredFields.length;
  const filledRequired = requiredFields.filter((f) => isFilled(values[f.id])).length;
  const allValid = filledRequired === totalRequired;

  const setValue = (id: string, v: string) =>
    setValues((prev) => ({ ...prev, [id]: v }));
  const markTouched = (id: string) =>
    setTouched((prev) => ({ ...prev, [id]: true }));

  const showError = (f: TemplateField) =>
    !!f.required &&
    !isFilled(values[f.id]) &&
    (touched[f.id] || submitAttempted);

  const handleSubmit = () => {
    setSubmitAttempted(true);
    if (!allValid) return;
    if (onSubmitted) {
      onSubmitted(values);
      return;
    }
    setSubmitted(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (submitted) {
    return (
      <Card className="flex flex-col items-center gap-3 border-success/40 bg-success-bg/40 py-10 text-center animate-pop">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-success-bg text-success-fg">
          <IconCircleCheck size={40} stroke={1.8} />
        </span>
        <h2 className="font-display text-xl font-semibold text-ink">
          ส่งข้อมูลเรียบร้อย ✓
        </h2>
        <p className="max-w-xs text-sm text-ink-soft">
          ระบบบันทึกข้อมูลของคุณสำหรับรอบนี้แล้ว ขอบคุณที่ส่งตรงเวลา
        </p>
        <Button variant="secondary" onClick={() => setSubmitted(false)}>
          แก้ไขข้อมูล
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4 pb-40 sm:pb-4">
      <ProgressBar filled={filledRequired} total={totalRequired} />

      {template.sections.map((section) => {
        const fields = template.fields.filter((f) => f.sectionId === section.id);
        if (fields.length === 0) return null;
        return (
          <Card key={section.id} className="space-y-4">
            <h3 className="border-l-4 border-accent pl-2 font-display text-base font-semibold text-ink">
              {section.title}
            </h3>
            <div className="space-y-4">
              {fields.map((f) => (
                <Field
                  key={f.id}
                  field={f}
                  value={values[f.id] ?? ""}
                  error={showError(f)}
                  onChange={(v) => setValue(f.id, v)}
                  onBlur={() => markTouched(f.id)}
                />
              ))}
            </div>
          </Card>
        );
      })}

      {/* Sticky bottom CTA on mobile, inline on >= sm */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-surface/95 p-3 backdrop-blur sm:static sm:bottom-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto max-w-content">
          <Button
            variant="accent"
            className="w-full"
            disabled={!allValid}
            onClick={handleSubmit}
          >
            {submitLabel}
          </Button>
          {submitAttempted && !allValid && (
            <p className="mt-2 text-center text-sm text-danger">
              กรุณากรอกช่องที่จำเป็น ({totalRequired - filledRequired} ช่องที่เหลือ)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  field,
  value,
  error,
  onChange,
  onBlur,
}: {
  field: TemplateField;
  value: string;
  error: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  const errorRing = error ? "border-danger focus:border-danger focus:ring-danger/30" : "";

  return (
    <div>
      <label
        htmlFor={field.id}
        className="mb-1.5 flex items-center gap-1 text-sm font-medium text-ink"
      >
        <span>{field.label}</span>
        {field.required && <span className="text-danger">*</span>}
        {field.unit && (
          <span className="text-xs font-normal text-ink-muted">({field.unit})</span>
        )}
      </label>

      {field.type === "textarea" ? (
        <textarea
          id={field.id}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          rows={4}
          className={cn(baseField, "py-2.5 leading-relaxed", errorRing)}
        />
      ) : field.type === "select" ? (
        <select
          id={field.id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={cn(baseField, value ? "text-ink" : "text-ink-muted", errorRing)}
        >
          <option value="" disabled>
            เลือก…
          </option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt} className="text-ink">
              {opt}
            </option>
          ))}
        </select>
      ) : field.type === "file" ? (
        <label
          htmlFor={field.id}
          className={cn(
            "flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-card border border-dashed text-base font-medium transition",
            value
              ? "border-success bg-success-bg/40 text-success-fg"
              : "border-border bg-surface text-ink-soft hover:bg-surface-soft",
            error && !value && "border-danger text-danger-fg",
          )}
        >
          <IconUpload size={20} stroke={1.8} />
          <span className="truncate px-2">{value || "เลือกไฟล์เพื่ออัปโหลด"}</span>
          <input
            id={field.id}
            type="file"
            className="sr-only"
            onChange={(e) => onChange(e.target.files?.[0]?.name ?? "")}
            onBlur={onBlur}
          />
        </label>
      ) : (
        <input
          id={field.id}
          type={field.type}
          inputMode={field.type === "number" ? "decimal" : undefined}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={cn(baseField, errorRing)}
        />
      )}

      {error ? (
        <p className="mt-1 text-sm text-danger">กรุณากรอกข้อมูลช่องนี้</p>
      ) : (
        field.help && <p className="mt-1 text-xs text-ink-muted">{field.help}</p>
      )}
    </div>
  );
}
