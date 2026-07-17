"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/forms/ProgressBar";
import { IconLock, IconPencil, IconClockHour4 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { fieldCls } from "@/components/portal/fieldStyles";
import {
  MONTHLY_SECTIONS, NOTE_FIELDS, REQUIRED_KEYS, STATUS_LABEL,
  filledRequiredCount, deriveStatus,
  type MonthlyIndicator,
} from "@/lib/forms/monthlyReport";

type Values = Record<string, string>;

const statusChip: Record<string, string> = {
  not_started: "bg-surface-soft text-ink-soft",
  in_progress: "bg-warning-bg text-warning-fg",
  completed: "bg-success-bg text-success-fg",
};

/**
 * The unified monthly per-location report — Railway-style: ก่อน/หลัง indicator pairs, AAI dimension
 * scores with descriptions, auto-derived status, completeness counter, previous-month hints, and a
 * draft/submit + lock/ขอแก้ไข lifecycle. Replaces the generic TemplateForm in the fill flow.
 */
export function MonthlyReportForm({
  initialValues,
  hints,
  locked,
  editRequested,
  onSaveDraft,
  onSubmit,
  onRequestEdit,
}: {
  initialValues?: Values;
  /** Previous-month values, shown as placeholders only (the new month starts blank). */
  hints?: Values;
  locked: boolean;
  editRequested: boolean;
  onSaveDraft: (values: Values) => Promise<void> | void;
  onSubmit: (values: Values) => Promise<void> | void;
  onRequestEdit?: () => Promise<void> | void;
}) {
  const [values, setValues] = useState<Values>(initialValues ?? {});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [busy, setBusy] = useState<null | "draft" | "submit" | "edit">(null);

  const filled = filledRequiredCount(values);
  const total = REQUIRED_KEYS.length;
  const allValid = filled === total;
  const status = useMemo(() => deriveStatus(values), [values]);
  const readOnly = locked;

  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));
  const hintFor = (k: string) => {
    const h = hints?.[k];
    return h != null && String(h).trim() !== "" ? `เดือนก่อน: ${h}` : undefined;
  };

  const runDraft = async () => { setBusy("draft"); try { await onSaveDraft(values); } finally { setBusy(null); } };
  const runSubmit = async () => {
    setSubmitAttempted(true);
    if (!allValid) { if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setBusy("submit"); try { await onSubmit(values); } finally { setBusy(null); }
  };
  const runEdit = async () => { if (!onRequestEdit) return; setBusy("edit"); try { await onRequestEdit(); } finally { setBusy(null); } };

  // AAI scores are 0–100 (2-digit / decimal allowed); headcounts are non-negative integers.
  const numInput = (key: string, missing: boolean, scale: "count" | "score" = "count") => (
    <input
      type="number"
      inputMode={scale === "score" ? "decimal" : "numeric"}
      step={scale === "score" ? "0.01" : "1"}
      min={0}
      {...(scale === "score" ? { max: 100 } : {})}
      value={values[key] ?? ""}
      placeholder={hintFor(key) ?? ""}
      disabled={readOnly}
      onChange={(e) => set(key, e.target.value)}
      className={cn(fieldCls, missing && "border-danger focus:border-danger focus:ring-danger/30")}
    />
  );

  const renderIndicator = (ind: MonthlyIndicator) => {
    const missingAfter = submitAttempted && !(values[ind.afterKey] ?? "").trim();
    const scale = ind.scale ?? "count";
    return (
      <div key={ind.afterKey} className="space-y-2">
        <div>
          <span className="text-sm font-medium text-ink">{ind.label}</span>
          {ind.unit && <span className="ml-1 text-xs font-normal text-ink-muted">({ind.unit})</span>}
          {ind.desc && <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{ind.desc}</p>}
        </div>
        {ind.beforeKey ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="mb-1 block text-xs text-ink-muted">ก่อน</span>
              {numInput(ind.beforeKey, false, scale)}
            </div>
            <div>
              <span className="mb-1 block text-xs text-ink-muted">หลัง <span className="text-danger">*</span></span>
              {numInput(ind.afterKey, missingAfter, scale)}
            </div>
          </div>
        ) : (
          <div>
            <span className="mb-1 block text-xs text-ink-muted">ค่าที่วัดได้ <span className="text-danger">*</span></span>
            {numInput(ind.afterKey, missingAfter, scale)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-40 sm:pb-4">
      <ProgressBar filled={filled} total={total} />

      {/* Auto-derived operating status (item 11) — read-only */}
      <Card className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-ink">สถานะการดำเนินงาน</div>
          <div className="text-xs text-ink-muted">กำหนดอัตโนมัติจากข้อมูลที่กรอก</div>
        </div>
        <span className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold", statusChip[status])}>
          {STATUS_LABEL[status]}
        </span>
      </Card>

      {locked && (
        <Card className={cn("flex items-start gap-2.5", editRequested ? "border-warning/40 bg-warning-bg/40" : "border-border")}>
          {editRequested ? (
            <>
              <IconClockHour4 size={20} className="mt-0.5 shrink-0 text-warning" />
              <div className="text-sm text-ink-soft">ส่งคำขอแก้ไขแล้ว — รอผู้ดูแลระบบอนุมัติ จากนั้นจึงจะแก้ไขได้อีกครั้ง</div>
            </>
          ) : (
            <>
              <IconLock size={20} className="mt-0.5 shrink-0 text-ink-muted" />
              <div className="text-sm text-ink-soft">ส่งข้อมูลแล้ว — ล็อกการแก้ไข หากต้องการแก้ไขให้กด “ขอแก้ไขข้อมูล”</div>
            </>
          )}
        </Card>
      )}

      {MONTHLY_SECTIONS.map((section) => (
        <Card key={section.title} className="space-y-4">
          <h3 className="border-l-4 border-accent pl-2 font-display text-base font-semibold text-ink">{section.title}</h3>
          <div className="space-y-4">{section.indicators.map(renderIndicator)}</div>
        </Card>
      ))}

      <Card className="space-y-4">
        <h3 className="border-l-4 border-accent pl-2 font-display text-base font-semibold text-ink">หมายเหตุ</h3>
        {NOTE_FIELDS.map((f) => (
          <div key={f.key}>
            <label className="mb-1.5 block text-sm font-medium text-ink">{f.label}</label>
            <textarea
              rows={3}
              value={values[f.key] ?? ""}
              placeholder={f.placeholder}
              disabled={readOnly}
              onChange={(e) => set(f.key, e.target.value)}
              className={cn(fieldCls, "py-2.5 leading-relaxed")}
            />
          </div>
        ))}
      </Card>

      {/* Sticky action bar — sits ABOVE the mobile bottom tab bar (56px + safe area) so the two fixed
          bars don't collide and the accent button doesn't bleed through the tab bar. */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-surface/95 p-3 backdrop-blur sm:static sm:bottom-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto max-w-content">
          {readOnly ? (
            editRequested ? (
              <Button variant="secondary" className="w-full" disabled>
                <IconClockHour4 size={18} /> รออนุมัติการแก้ไข
              </Button>
            ) : (
              <Button variant="secondary" className="w-full" disabled={busy === "edit"} onClick={runEdit}>
                <IconPencil size={18} /> {busy === "edit" ? "กำลังส่งคำขอ…" : "ขอแก้ไขข้อมูล"}
              </Button>
            )
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" disabled={busy !== null} onClick={runDraft}>
                {busy === "draft" ? "กำลังบันทึก…" : "บันทึกร่าง"}
              </Button>
              <Button variant="accent" className="flex-1" disabled={busy !== null || !allValid} onClick={runSubmit}>
                {busy === "submit" ? "กำลังส่ง…" : "ส่งข้อมูลพื้นที่นี้"}
              </Button>
            </div>
          )}
          {submitAttempted && !allValid && !readOnly && (
            <p className="mt-2 text-center text-sm text-danger">กรุณากรอกช่องที่จำเป็น (เหลือ {total - filled} ช่อง)</p>
          )}
        </div>
      </div>
    </div>
  );
}
