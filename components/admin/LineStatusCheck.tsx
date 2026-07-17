"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { IconPlugConnected, IconCircleCheck, IconAlertTriangle } from "@tabler/icons-react";

/** A read-only "is LINE connected?" button — calls bot/info (no message sent) and shows the OA name or the error. */
export function LineStatusCheck() {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; name?: string; error?: string } | null>(null);
  async function check() {
    setBusy(true);
    const r = await fetch("/api/admin/line-check").then((x) => x.json()).catch(() => ({ ok: false, error: "network" }));
    setRes(r); setBusy(false);
  }
  const errMsg = res?.error === "line_token_not_set" ? "ยังไม่ได้ตั้งค่า LINE token"
    : res?.error === "line_401" ? "token ไม่ถูกต้อง / หมดอายุ" : res?.error;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={check} disabled={busy}
        className={cn("inline-flex items-center gap-1.5 rounded-card border border-border px-2.5 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-surface-soft disabled:opacity-50")}>
        <IconPlugConnected size={14} /> {busy ? "กำลังตรวจสอบ…" : "ทดสอบการเชื่อมต่อ LINE"}
      </button>
      {res && (res.ok ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-success-fg">
          <IconCircleCheck size={14} /> เชื่อมต่อแล้ว{res.name ? `: ${res.name}` : ""}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-danger-fg">
          <IconAlertTriangle size={14} /> {errMsg}
        </span>
      ))}
    </div>
  );
}
