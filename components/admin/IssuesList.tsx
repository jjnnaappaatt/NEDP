"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { IconCheck, IconRotateClockwise, IconPhoto } from "@tabler/icons-react";
import type { AdminIssue } from "@/lib/data";

export function IssuesList({ initial }: { initial: AdminIssue[] }) {
  const [issues, setIssues] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);

  async function toggle(it: AdminIssue) {
    const next = it.status === "resolved" ? "open" : "resolved";
    setBusy(it.id);
    try {
      const res = await fetch("/api/admin/issues", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: it.id, status: next }),
      });
      if (res.ok) setIssues((arr) => arr.map((x) => (x.id === it.id ? { ...x, status: next } : x)));
    } finally {
      setBusy(null);
    }
  }

  if (!issues.length) return <Card className="p-8 text-center text-ink-soft">ยังไม่มีเรื่องแจ้ง</Card>;

  return (
    <div className="space-y-2">
      {issues.map((it) => {
        const resolved = it.status === "resolved";
        return (
          <Card key={it.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                {it.ticket && <span className="rounded bg-surface-soft px-1.5 py-0.5 text-xs font-medium text-ink-soft">{it.ticket}</span>}
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium",
                  resolved ? "bg-success-bg text-success-fg" : "bg-warning-bg text-warning-fg")}>
                  {resolved ? "แก้ไขแล้ว" : "เปิดอยู่"}
                </span>
                {it.type && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-ink">{it.type}</span>}
                {it.projectName && <span className="truncate text-xs text-ink-muted">{it.projectName}</span>}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-ink">{it.description}</p>
              {it.screenshotUrl && (
                <a href={it.screenshotUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                  <IconPhoto size={13} /> ดูภาพหน้าจอ
                </a>
              )}
            </div>
            <button onClick={() => toggle(it)} disabled={busy === it.id}
              className="inline-flex shrink-0 items-center gap-1 rounded-card border border-border px-2.5 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-surface-soft disabled:opacity-50">
              {resolved ? <><IconRotateClockwise size={14} /> เปิดใหม่</> : <><IconCheck size={14} /> แก้แล้ว</>}
            </button>
          </Card>
        );
      })}
    </div>
  );
}
