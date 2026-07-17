"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/line/LiffProvider";
import { ConnectLineButton } from "@/components/line/ConnectLineButton";
import { Avatar } from "@/components/ui/Avatar";
import type { Account } from "@/types";

const fieldCls =
  "min-h-[44px] w-full rounded-card border border-border bg-surface px-3 text-base text-ink outline-none focus:border-border-accent focus:ring-2 focus:ring-border-accent/30";

/** Profile editor — the user updates their own name/phone/org/email (same gate as the register
 *  ContactForm, via /api/my-contact) and sees whether their LINE account is linked. */
export function ProfileForm({ me, initial, lineLinked }: {
  me: Account;
  initial: { name: string; phone: string; org: string; email: string };
  lineLinked: boolean;
}) {
  const router = useRouter();
  const { profile } = useLiff();
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [org, setOrg] = useState(initial.org);
  const [email, setEmail] = useState(initial.email);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    if (name.trim().split(/\s+/).filter(Boolean).length < 2) { setMsg("กรุณากรอกชื่อ-นามสกุลจริง (ทั้งชื่อและนามสกุล)"); return; }
    if (!phone.trim()) { setMsg("กรุณากรอกเบอร์โทร"); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/my-contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, org, email }),
      });
      setMsg(res.ok ? "บันทึกโปรไฟล์แล้ว ✓" : "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
      if (res.ok) router.refresh();
    } finally { setBusy(false); }
  };

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center gap-3">
        <Avatar account={{ ...me, name: profile?.displayName ?? name, pictureUrl: profile?.pictureUrl ?? me.pictureUrl }} size={48} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-base font-semibold text-ink">{name || profile?.displayName || "โปรไฟล์ของฉัน"}</div>
          {lineLinked ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success-fg">
              <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-[#06C755] text-[8px] text-white">✓</span>
              เชื่อมต่อ LINE แล้ว{profile?.displayName ? `: ${profile.displayName}` : ""}
            </span>
          ) : (
            <span className="text-xs text-ink-muted">ยังไม่ได้เชื่อมต่อ LINE</span>
          )}
        </div>
        {(!lineLinked || !(me.pictureUrl || profile?.pictureUrl)) && (
          <ConnectLineButton className="shrink-0 px-3" label={lineLinked ? "อัปเดตรูป LINE" : "เชื่อมต่อ LINE"} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">ชื่อ-นามสกุล (จริง) *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อจริง นามสกุลจริง" className={fieldCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">เบอร์โทร *</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="เบอร์โทร *" inputMode="tel" className={fieldCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">หน่วยงาน</span>
          <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="หน่วยงาน/สังกัด" className={fieldCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">อีเมล</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="อีเมล" inputMode="email" className={fieldCls} />
        </label>
      </div>

      <button onClick={save} disabled={busy}
        className="w-full rounded-xl bg-hero py-2.5 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-50">
        {busy ? "กำลังบันทึก…" : "💾 บันทึกโปรไฟล์"}
      </button>
      {msg && <p className="text-center text-sm text-ink-soft">{msg}</p>}
    </div>
  );
}
