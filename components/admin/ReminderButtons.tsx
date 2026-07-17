"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { IconSend, IconMapPin, IconBellRinging } from "@tabler/icons-react";

type SendResult = { ok?: boolean; sent?: number; failed?: number; skipped?: number; projects?: number; error?: string };

function summarize(r: SendResult): { text: string; tone: "ok" | "warn" | "err" } {
  if (r.error === "line_token_not_set") return { text: "ยังไม่ได้ตั้งค่า LINE token ใน Vercel", tone: "err" };
  if (r.error === "no_monitor_project") return { text: "โครงการนี้ยังไม่ได้ซิงค์กับบอท", tone: "err" };
  if (r.error && !r.sent) return { text: "ส่งไม่สำเร็จ", tone: "err" };
  const parts = [`ส่งแล้ว ${r.sent ?? 0}`];
  if (r.failed) parts.push(`ล้มเหลว ${r.failed}`);
  if (r.skipped) parts.push(`ข้าม ${r.skipped}`);
  return { text: parts.join(" · ") + (r.projects ? ` (${r.projects} โครงการ)` : ""), tone: r.failed ? "warn" : "ok" };
}

async function post(body: unknown): Promise<SendResult> {
  const res = await fetch("/api/admin/send-reminder", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return res.json().catch(() => ({ error: "network" }));
}

const btn = "inline-flex items-center justify-center gap-1 rounded-card border px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-50";
const toneCls = { ok: "text-success-fg", warn: "text-warning-fg", err: "text-danger-fg" };

/** Per-project reminder buttons (เตือนส่งข้อมูล / เตือนยืนยันพื้นที่). */
export function ReminderButtons({ projectId }: { projectId: string }) {
  const [busy, setBusy] = useState<null | "submit" | "location">(null);
  const [res, setRes] = useState<SendResult | null>(null);
  async function send(type: "submit" | "location") {
    setBusy(type); setRes(null);
    setRes(await post({ type, projectId }));
    setBusy(null);
  }
  const s = res ? summarize(res) : null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => send("submit")} disabled={busy !== null}
        className={cn(btn, "border-border text-ink-soft hover:bg-surface-soft")}>
        <IconSend size={13} /> เตือนส่งข้อมูล
      </button>
      <button onClick={() => send("location")} disabled={busy !== null}
        className={cn(btn, "border-border text-ink-soft hover:bg-surface-soft")}>
        <IconMapPin size={13} /> เตือนยืนยันพื้นที่
      </button>
      {busy && <span className="text-xs text-ink-muted">กำลังส่ง…</span>}
      {s && <span className={cn("text-xs font-medium", toneCls[s.tone])}>{s.text}</span>}
    </div>
  );
}

/** Bulk "remind every project that's still ค้าง". Defaults to the ส่งข้อมูล reminder (not-yet-submitted);
 *  pass type="location" for the ยืนยันพื้นที่ reminder (not-yet-verified). */
export function BulkReminderButton({
  type = "submit", label,
}: { type?: "submit" | "location"; label?: string } = {}) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<SendResult | null>(null);
  async function send() {
    setBusy(true); setRes(null);
    setRes(await post({ type, all: true }));
    setBusy(false);
  }
  const s = res ? summarize(res) : null;
  const text = label ?? (type === "submit" ? "แจ้งเตือนทุกโครงการที่ค้าง" : "เตือนยืนยันพื้นที่ทุกโครงการที่ค้าง");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={send} disabled={busy}
        className={cn(btn, "border-accent bg-accent-soft text-ink hover:bg-accent-soft/70")}>
        <IconBellRinging size={14} /> {busy ? "กำลังส่ง…" : text}
      </button>
      {s && <span className={cn("text-xs font-medium", toneCls[s.tone])}>{s.text}</span>}
    </div>
  );
}
