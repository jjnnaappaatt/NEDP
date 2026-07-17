"use client";

import { useRef, useState } from "react";
import { IconCircleCheck, IconCopy, IconCheck } from "@tabler/icons-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { IssueReport } from "@/types";

const ISSUE_TYPES = [
  "ข้อมูลไม่ถูกต้อง",
  "ระบบทำงานผิดปกติ",
  "ไม่สามารถส่งข้อมูลได้",
  "อื่นๆ",
] as const;

const MAX_DESC = 500;

/** แจ้งปัญหา — bottom-sheet form that POSTs to /api/report-issue (creates a monitor_issues row the admin sees,
 *  uploads the optional screenshot) and shows the returned NEDP ticket. */
export function ReportIssueSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [type, setType] = useState<string>(ISSUE_TYPES[0]);
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IssueReport | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setType(ISSUE_TYPES[0]);
    setDescription("");
    setEmail("");
    setFile(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
    setResult(null);
    setCopied(false);
    setSubmitting(false);
  }

  function handleClose() {
    onClose();
    // delay reset so the closing animation doesn't flash empty state
    setTimeout(reset, 200);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("type", type);
      fd.set("description", description.trim());
      if (email.trim()) fd.set("email", email.trim());
      if (file) fd.set("screenshot", file);
      const res = await fetch("/api/report-issue", { method: "POST", body: fd });
      const j = (await res.json().catch(() => ({}))) as { ticket?: string; error?: string };
      if (res.ok && j.ticket) {
        setResult({ id: "", type, description: description.trim(), email: email.trim() || undefined, status: "open", ticket: j.ticket, createdAt: new Date().toISOString() });
      } else {
        setError(j.error === "file too large" ? "ไฟล์ภาพใหญ่เกินไป (สูงสุด 5MB)" : "ส่งรายงานไม่สำเร็จ — ลองใหม่อีกครั้ง");
      }
    } catch {
      setError("ส่งรายงานไม่สำเร็จ — ลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  }

  function copyTicket() {
    if (!result) return;
    navigator.clipboard?.writeText(result.ticket).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      },
      () => {},
    );
  }

  const fieldClass =
    "w-full min-h-[44px] rounded-card border border-border bg-surface px-3 py-2 text-[16px] " +
    "text-ink placeholder:text-ink-muted focus:border-border-accent focus:outline-none";

  return (
    <Sheet open={open} onClose={handleClose} title={result ? undefined : "รายงานปัญหา"}>
      {result ? (
        <div className="animate-fadeUp space-y-4">
          <Card className="flex flex-col items-center gap-3 border-success-bg bg-success-bg/40 py-6 text-center">
            <IconCircleCheck size={48} stroke={1.8} className="text-success" />
            <div>
              <p className="font-display text-lg font-semibold text-ink">รับเรื่องแล้ว ✓</p>
              <p className="mt-1 text-sm text-ink-soft">ทีมงานจะตรวจสอบและติดต่อกลับโดยเร็ว</p>
            </div>
            <div className="flex items-center gap-2 rounded-card border border-border bg-surface px-3 py-2">
              <span className="text-sm text-ink-soft">เลขที่เรื่อง</span>
              <span className="font-display text-base font-semibold tracking-wide text-ink">
                {result.ticket}
              </span>
              <button
                type="button"
                onClick={copyTicket}
                aria-label="คัดลอกเลขที่เรื่อง"
                className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-surface-soft"
              >
                {copied ? (
                  <IconCheck size={18} className="text-success" />
                ) : (
                  <IconCopy size={18} />
                )}
              </button>
            </div>
          </Card>
          <Button variant="primary" className="w-full" onClick={handleClose}>
            ปิด
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="issue-type" className="block text-sm font-medium text-ink">
              ประเภทปัญหา
            </label>
            <select
              id="issue-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={fieldClass}
            >
              {ISSUE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="issue-desc" className="block text-sm font-medium text-ink">
                รายละเอียด
              </label>
              <span className="text-xs tabular-nums text-ink-muted">
                {description.length}/{MAX_DESC}
              </span>
            </div>
            <textarea
              id="issue-desc"
              value={description}
              maxLength={MAX_DESC}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="อธิบายปัญหาที่พบ เช่น หน้าจอที่เกิดปัญหา ขั้นตอนที่ทำ และผลที่เกิดขึ้น"
              className={fieldClass + " resize-none leading-relaxed"}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="issue-file" className="block text-sm font-medium text-ink">
              แนบภาพหน้าจอ <span className="text-ink-muted">(ไม่บังคับ)</span>
            </label>
            <input
              id="issue-file"
              type="file"
              accept="image/*"
              ref={fileRef}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className={
                "w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-ink-soft " +
                "file:mr-3 file:min-h-[36px] file:cursor-pointer file:rounded-md file:border-0 " +
                "file:bg-accent-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink-accent"
              }
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="issue-email" className="block text-sm font-medium text-ink">
              ข้อมูลติดต่อกลับ <span className="text-ink-muted">(ไม่บังคับ)</span>
            </label>
            <input
              id="issue-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="อีเมลสำหรับติดต่อกลับ"
              className={fieldClass}
            />
          </div>

          {error && <p className="text-sm font-medium text-danger-fg">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={handleClose}>
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={!description.trim() || submitting}
            >
              ส่งรายงาน
            </Button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
