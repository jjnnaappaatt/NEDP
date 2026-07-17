"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Self-enroll for a project on the in-web /register picker. Gated on contact info: if the account
 *  has no contact info yet, enrollment is blocked (the page's ContactForm must be saved first). */
export function RegisterButton({ projectId, registered, canEnroll }: {
  projectId: string;
  registered: boolean;
  canEnroll: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(registered);
  const [err, setErr] = useState<string | null>(null);

  if (done) {
    // Registering IS subscribing — state it so the merge is obvious at the moment of enrollment.
    return (
      <span className="flex-none rounded-lg bg-success-bg px-3 py-1.5 text-center text-sm font-semibold text-success-fg">
        ✓ ลงทะเบียนแล้ว
        <span className="mt-0.5 block text-xs font-medium text-success-fg">🔔 รับการแจ้งเตือนแล้ว</span>
      </span>
    );
  }

  const enroll = async () => {
    if (!canEnroll) {
      setErr("กรอกข้อมูลผู้ติดต่อด้านบนก่อน");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/register-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setDone(true);
        // Continue straight into ยืนยันพื้นที่โครงการ (the location-confirm step) for the new project.
        router.push(`/status/${projectId}?confirm=1`);
      } else {
        setErr(data.error === "no_contact" ? "กรอกข้อมูลผู้ติดต่อด้านบนก่อน" : "ลงทะเบียนไม่สำเร็จ");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-none flex-col items-end gap-1">
      <button
        onClick={enroll}
        disabled={busy || !canEnroll}
        title={!canEnroll ? "กรอกข้อมูลผู้ติดต่อก่อน" : undefined}
        className="rounded-lg bg-hero px-4 py-1.5 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-40"
      >
        {busy ? "กำลังลงทะเบียน…" : "ลงทะเบียน"}
      </button>
      {err && <span className="text-right text-xs text-danger-fg">{err}</span>}
    </div>
  );
}
