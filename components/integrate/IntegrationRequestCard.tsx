"use client";

import { useState } from "react";
import Link from "next/link";
import { IconClockHour4, IconDatabaseImport } from "@tabler/icons-react";

/** Head-side onboarding gate: request to enable individual-data integration for this project. Shown when
 *  integration is NOT yet enabled; once approved, the /integrate page renders the upload card instead. */
export function IntegrationRequestCard({ projectId, canEdit, pending }: {
  projectId: string; canEdit: boolean; pending: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"idle" | "pending" | "error">(pending ? "pending" : "idle");

  const request = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/request-integration", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean };
      setState(res.ok && d.ok ? "pending" : "error");
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
        <IconDatabaseImport size={18} /> นำเข้าแบบสอบถามโครงการ
      </div>
      {state === "pending" ? (
        <p className="flex items-center gap-1.5 text-sm text-warning-fg">
          <IconClockHour4 size={16} /> ส่งคำขอแล้ว — รอแอดมินอนุมัติ
        </p>
      ) : !canEdit ? (
        <p className="text-sm text-ink-soft">
          ต้อง<Link href="/register" className="font-semibold underline">ลงทะเบียนเป็นผู้รับผิดชอบโครงการ</Link>ก่อน จึงจะขอเปิดการนำเข้าแบบสอบถามได้
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-soft">
            ขอเปิดใช้งานเพื่อ<b>นำเข้าแบบสอบถามผู้สูงอายุ</b> แล้วให้ระบบคำนวณคะแนน AAI ให้อัตโนมัติ — แอดมินจะตรวจสอบและอนุมัติ
          </p>
          <button onClick={request} disabled={busy}
            className="rounded-lg bg-hero px-4 py-2.5 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-40">
            {busy ? "กำลังส่งคำขอ…" : "ขอเปิดการนำเข้าแบบสอบถาม"}
          </button>
          {state === "error" && <p className="mt-2 text-sm text-warning-fg">ส่งคำขอไม่สำเร็จ ลองใหม่อีกครั้ง</p>}
        </>
      )}
    </div>
  );
}
