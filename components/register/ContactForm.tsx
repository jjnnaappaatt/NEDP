"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectLineButton } from "@/components/line/ConnectLineButton";

const fieldCls =
  "min-h-[44px] w-full rounded-card border border-border bg-surface px-3 text-base text-ink outline-none focus:border-border-accent focus:ring-2 focus:ring-border-accent/30";

/**
 * The contact-info gate: a user must save their name + phone before they can enroll in / edit any
 * project (prevents editing other projects' data + gives traceability). On save we refresh so the
 * server re-renders the now-unlocked enroll buttons.
 */
export function ContactForm({ initialName, initialPhone, hasContact, lineLinked }: {
  initialName: string;
  initialPhone: string;
  hasContact: boolean;
  lineLinked: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    if (name.trim().split(/\s+/).filter(Boolean).length < 2) {
      setMsg("กรุณากรอกชื่อ-นามสกุลจริง (ทั้งชื่อและนามสกุล)");
      return;
    }
    if (!phone.trim()) {
      setMsg("กรุณากรอกเบอร์โทร");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/my-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      if (res.ok) {
        setMsg("บันทึกข้อมูลผู้ติดต่อแล้ว ✓");
        router.refresh();
      } else {
        setMsg("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-base font-semibold text-ink">ข้อมูลผู้ติดต่อ</h2>
        {hasContact ? (
          <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success-fg">✓ ครบแล้ว</span>
        ) : (
          <span className="rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning-fg">ต้องกรอกก่อน</span>
        )}
      </div>
      <p className="text-xs text-ink-soft">
        กรอกชื่อ-นามสกุลจริงและเบอร์โทรของผู้รับผิดชอบก่อน จึงจะลงทะเบียนและส่ง/แก้ไขข้อมูลโครงการได้ (เพื่อความถูกต้องและตรวจสอบย้อนกลับได้)
      </p>
      {!lineLinked && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-surface-soft p-2.5">
          <span className="text-xs text-ink-soft">เชื่อมต่อบัญชี LINE เพื่อใช้รูปโปรไฟล์และรับการแจ้งเตือน</span>
          <ConnectLineButton className="shrink-0 px-3" label="เชื่อมต่อ LINE" />
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อจริง นามสกุลจริง *" className={fieldCls} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="เบอร์โทร *" inputMode="tel" className={fieldCls} />
      </div>
      <button
        onClick={save}
        disabled={busy}
        className="w-full rounded-xl bg-hero py-2.5 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-50"
      >
        {busy ? "กำลังบันทึก…" : "💾 บันทึกข้อมูลผู้ติดต่อ"}
      </button>
      {msg && <p className="text-center text-sm text-ink-soft">{msg}</p>}
    </div>
  );
}
