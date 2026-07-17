"use client";

import { useState } from "react";
import { IconX } from "@tabler/icons-react";

/**
 * One unified "leave project" control: in NEDP, registering a project IS subscribing to its monthly
 * LINE notifications, so unregistering here also unsubscribes (single action). Submitted data is kept.
 * If you were this project's location confirmer, the server (web_unsubscribe) clears the confirmation
 * so someone must re-confirm. Reused on /status and /dashboard project cards.
 */
export function UnregisterButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/unregister-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (res.ok && data.ok) {
        window.location.reload();
        return;
      }
      setErr("ยกเลิกไม่สำเร็จ — ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="ยกเลิกการลงทะเบียนและการแจ้งเตือน"
        title="ยกเลิกการลงทะเบียน + การแจ้งเตือน"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-muted transition hover:bg-danger/10 hover:text-danger"
      >
        <IconX size={18} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-card border border-border bg-surface p-5 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-base font-semibold text-ink">ยกเลิกการลงทะเบียน + การแจ้งเตือน?</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              “{projectName}” จะถูกนำออกจากรายการของคุณ และคุณจะ<b>หยุดรับการแจ้งเตือนรายเดือนทาง LINE</b>ของโครงการนี้ — ข้อมูลที่ส่งแล้วจะยังคงอยู่
            </p>
            <p className="mt-2 rounded-card border border-warning/40 bg-warning-bg p-2.5 text-xs leading-relaxed text-warning-fg">
              หากคุณเป็นผู้ยืนยันพื้นที่ของโครงการ การยืนยันจะถูกล้าง และต้องมีผู้ยืนยันพื้นที่ใหม่อีกครั้ง
            </p>
            {err && <p className="mt-2 text-sm font-medium text-danger">{err}</p>}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="flex-1 rounded-card border border-border py-2.5 text-sm font-medium text-ink-soft hover:bg-surface-soft disabled:opacity-50"
              >
                ไม่ยกเลิก
              </button>
              <button
                onClick={submit}
                disabled={busy}
                className="flex-1 rounded-card bg-danger py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? "กำลังยกเลิก…" : "ยืนยันยกเลิก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
