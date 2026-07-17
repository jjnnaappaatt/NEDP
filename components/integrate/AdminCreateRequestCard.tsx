"use client";

import { useState } from "react";
import { IconHelpCircle, IconCircleCheck } from "@tabler/icons-react";

/** For members who don't want to author the questionnaire JSON themselves: send a request asking the
 *  admin to build it. Reuses the issue queue (submitIssue → monitor_issues → /admin/issues). */
export function AdminCreateRequestCard({ projectId, projectName, canEdit }: {
  projectId: string; projectName: string; canEdit: boolean;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const fd = new FormData();
      fd.set("type", "ขอสร้างแบบสอบถาม");
      fd.set("description",
        `โครงการ "${projectName}" (${projectId}) ขอให้แอดมินช่วยสร้างแบบสอบถามให้` +
        (note.trim() ? ` — รายละเอียด: ${note.trim()}` : ""));
      const res = await fetch("/api/report-issue", { method: "POST", body: fd });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && d.ok) setSent(true);
      else setErr(d.error ?? "ส่งคำขอไม่สำเร็จ");
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
        <IconHelpCircle size={18} /> ให้แอดมินช่วยสร้างแบบสอบถามให้
      </div>
      {sent ? (
        <p className="flex items-center gap-1.5 text-sm text-success-fg">
          <IconCircleCheck size={16} /> ส่งคำขอให้แอดมินแล้ว — แอดมินจะช่วยสร้างแบบสอบถามให้
        </p>
      ) : !canEdit ? (
        <p className="text-sm text-ink-soft">ต้องเป็นผู้รับผิดชอบโครงการก่อน จึงจะส่งคำขอได้</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-ink-soft">
            ไม่อยากเขียน JSON เอง? ส่งรายละเอียดสั้นๆ ว่าต้องการเก็บข้อมูลอะไร แล้วแอดมินจะช่วยสร้างแบบสอบถามให้
          </p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            placeholder="เช่น ต้องการแบบสอบถามความพึงพอใจ 10 ข้อ + วัดความรู้ก่อน/หลัง" />
          {err && <p className="text-sm text-warning-fg">{err}</p>}
          <button onClick={submit} disabled={busy}
            className="rounded-lg bg-hero px-4 py-2.5 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-40">
            {busy ? "กำลังส่ง…" : "ส่งคำขอให้แอดมิน"}
          </button>
        </div>
      )}
    </div>
  );
}
