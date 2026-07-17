"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { IconEye } from "@tabler/icons-react";

type Summary = { projectName: string; reminderType: string; sent: number; failed: number; skipped: number };
const TYPE_LABEL: Record<string, string> = { advance: "ล่วงหน้า", due: "ครบกำหนด", overdue: "เกินกำหนด", location: "ยืนยันพื้นที่" };

/** Dry-run the daily cron and show what it WOULD send today — no messages sent, no log written. */
export function ReminderPreview() {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ reminders: Summary[]; locations: Summary[] } | null>(null);
  async function run() {
    setBusy(true);
    const r = await fetch("/api/admin/reminder-preview").then((x) => x.json()).catch(() => null);
    setRes(r && r.ok ? r : { reminders: [], locations: [] });
    setBusy(false);
  }
  const all = res ? [...res.reminders, ...res.locations] : [];
  return (
    <div className="space-y-2">
      <button onClick={run} disabled={busy}
        className={cn("inline-flex items-center gap-1.5 rounded-card border border-border px-2.5 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-surface-soft disabled:opacity-50")}>
        <IconEye size={14} /> {busy ? "กำลังคำนวณ…" : "ดูตัวอย่างรอบอัตโนมัติวันนี้ (ไม่ส่งจริง)"}
      </button>
      {res && (
        all.length === 0 ? (
          <p className="text-xs text-ink-muted">วันนี้ยังไม่มีโครงการที่ถึงกำหนดต้องแจ้งเตือน (ตามรอบ advance/due/overdue + ยืนยันพื้นที่)</p>
        ) : (
          <div className="space-y-1">
            <p className="text-xs text-ink-soft">รอบอัตโนมัติวันนี้จะส่งให้ {all.length} โครงการ:</p>
            {all.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-card bg-surface-soft px-2.5 py-1.5 text-xs">
                <span className="truncate text-ink">{s.projectName}</span>
                <span className="shrink-0 text-ink-muted">
                  {TYPE_LABEL[s.reminderType] ?? s.reminderType} · ผู้รับ {s.sent}{s.skipped ? ` · ข้าม ${s.skipped}` : ""}
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
