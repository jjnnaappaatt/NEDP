"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconClipboardCheck, IconCheck, IconX } from "@tabler/icons-react";
import type { HeadQuestionnaireRequest } from "@/lib/data";

/** Head-side approval queue: pending questionnaire requests for a project the caller heads. Approving
 *  creates + assigns the questionnaire (server-side); rejecting drops the request. */
export function HeadQuestionnaireApprovals({ requests }: { requests: HeadQuestionnaireRequest[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (requests.length === 0) return null;

  const decide = async (requestId: string, action: "approve" | "reject") => {
    setBusy(requestId + action); setErr(null);
    try {
      const res = await fetch("/api/questionnaire-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && d.ok) router.refresh();
      else setErr(d.error === "not_head" ? "เฉพาะหัวหน้าโครงการเท่านั้น" : d.error ?? "ดำเนินการไม่สำเร็จ");
    } finally { setBusy(null); }
  };

  return (
    <div className="rounded-card border border-accent/40 bg-accent-soft/20 p-4">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
        <IconClipboardCheck size={18} className="text-accent" /> คำขอเพิ่มแบบสอบถาม — รออนุมัติ ({requests.length})
      </div>
      <p className="mb-3 text-xs text-ink-soft">อนุมัติแล้ว ระบบจะสร้างแบบสอบถามและกำหนดให้โครงการนี้โดยอัตโนมัติ</p>
      {err && <p className="mb-2 text-sm text-warning-fg">{err}</p>}
      <div className="space-y-2">
        {requests.map((r) => (
          <div key={r.requestId} className="rounded-card border border-border bg-surface p-3">
            <div className="text-sm font-medium text-ink">{r.title || "(ไม่มีชื่อ)"}</div>
            <div className="mt-0.5 text-xs text-ink-soft">
              {r.questionCount} ข้อ{r.scoreCount > 0 ? ` · ${r.scoreCount} คะแนนเฉพาะ` : ""}
              {r.includeAai ? " · รวม AAI" : ""}
              {r.requesterName ? ` · เสนอโดย ${r.requesterName}` : ""}
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => decide(r.requestId, "approve")} disabled={!!busy}
                className="inline-flex items-center gap-1 rounded-lg bg-hero px-3 py-1.5 text-xs font-semibold text-[var(--on-primary)] disabled:opacity-40">
                <IconCheck size={14} /> {busy === r.requestId + "approve" ? "กำลังอนุมัติ…" : "อนุมัติ + ฝัง"}
              </button>
              <button onClick={() => decide(r.requestId, "reject")} disabled={!!busy}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-soft disabled:opacity-40">
                <IconX size={14} /> ปฏิเสธ
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
