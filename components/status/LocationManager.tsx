"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconPlus, IconTrash, IconShieldCheck, IconClipboardCheck } from "@tabler/icons-react";
import type { LocationAuditEntry, LocationVerification, ProjectLocation } from "@/types";

const MONTHS = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
function fmt(iso: string): string {
  const [d, tm] = iso.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const t = (tm || "").slice(0, 5);
  return `${day} ${MONTHS[m]} ${y + 543}${t ? ` ${t} น.` : ""}`;
}
const AUDIT_LABEL: Record<string, string> = {
  rename: "✏️ แก้ไขพื้นที่", add: "➕ เพิ่มพื้นที่", delete: "🗑️ ลบพื้นที่", verify: "✅ ยืนยันพื้นที่",
};
function locText(d: { province?: string; amphoe?: string; tambon?: string } | null): string {
  if (!d) return "";
  return [d.tambon, d.amphoe, d.province].filter(Boolean).join(" · ");
}
function auditDetail(a: LocationAuditEntry): string {
  if (a.action === "rename") return `${locText(a.before)} → ${locText(a.after)}`;
  if (a.action === "add") return locText(a.after);
  if (a.action === "delete") return locText(a.before);
  return "";
}
const fieldCls =
  "min-h-[44px] w-full rounded-card border border-border bg-surface px-3 text-base text-ink outline-none focus:border-border-accent focus:ring-2 focus:ring-border-accent/30 disabled:bg-surface-soft disabled:text-ink-muted";

/** The project-management editor (สถานะ/จัดการ portal): edit the รายชื่อพื้นที่ list + ยืนยันพื้นที่ +
 *  audit trail. Writes via the existing /api/save-locations and /api/verify-locations (→ web_save_locations
 *  / web_verify_locations, which keep the bot's monitor tables in sync). */
export function LocationManager({ projectId, initialLocations, initialVerification, initialAudit, meName, canEdit }: {
  projectId: string;
  initialLocations: ProjectLocation[];
  initialVerification: LocationVerification | null;
  initialAudit: LocationAuditEntry[];
  meName: string;
  canEdit: boolean;
}) {
  const [locs, setLocs] = useState<ProjectLocation[]>(initialLocations);
  const [verifiedBy, setVerifiedBy] = useState<string | null>(initialVerification?.verifiedBy ?? null);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(initialVerification?.verifiedAt ?? null);
  const [verifierInput, setVerifierInput] = useState(initialVerification?.verifiedBy ?? meName);
  const [seq, setSeq] = useState(1);
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  async function persistEdits() {
    setBusy(true); setSavedMsg(null);
    try {
      const res = await fetch("/api/save-locations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, locations: locs, editedBy: meName }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; blocked?: string[] };
      setSavedMsg(data.blocked?.length ? `บันทึกแล้ว · ลบไม่ได้ (มีข้อมูลส่งแล้ว): ${data.blocked.join(", ")}` : "บันทึกการแก้ไขแล้ว ✓");
      if (typeof window !== "undefined") setTimeout(() => window.location.reload(), 950);
    } catch {
      setSavedMsg("บันทึกไม่สำเร็จ — ลองใหม่อีกครั้ง");
    } finally { setBusy(false); }
  }

  async function persistVerify() {
    const by = verifierInput.trim() || meName;
    setVerifiedBy(by); setVerifiedAt(new Date().toISOString());
    setBusy(true); setSavedMsg(null);
    try {
      await fetch("/api/verify-locations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, verifiedBy: by }),
      });
      setSavedMsg("ยืนยันและบันทึกแล้ว ✓");
    } catch {
      setSavedMsg("บันทึกไม่สำเร็จ — ลองใหม่อีกครั้ง");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      {!canEdit && (
        <Card className="border-warning/40 bg-warning-bg p-3 text-sm text-warning-fg">
          👁️ ดูแบบอ่านอย่างเดียว — ต้อง <Link href="/register" className="font-semibold underline">ลงทะเบียนเป็นผู้ติดต่อ</Link> ก่อน จึงจะแก้ไข/ยืนยันพื้นที่ได้
        </Card>
      )}

      <Card className="space-y-3">
        <h3 className="border-l-4 border-accent pl-2 font-display text-base font-semibold text-ink">แก้ไขพื้นที่ลงพื้นที่</h3>
        <p className="text-sm text-ink-soft">เพิ่ม แก้ไข หรือลบพื้นที่ที่โครงการรับผิดชอบ</p>
        <div className="space-y-3">
          {locs.map((l, i) => (
            <div key={l.id} className="rounded-card border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-ink-muted">พื้นที่ {i + 1}</span>
                {canEdit && (
                  <button onClick={() => setLocs((p) => p.filter((x) => x.id !== l.id))} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 px-2 text-xs font-medium text-danger-fg">
                    <IconTrash size={14} /> ลบ
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input value={l.province} placeholder="จังหวัด" disabled={!canEdit} onChange={(e) => setLocs((p) => p.map((x) => x.id === l.id ? { ...x, province: e.target.value } : x))} className={fieldCls} />
                <input value={l.amphoe} placeholder="อำเภอ" disabled={!canEdit} onChange={(e) => setLocs((p) => p.map((x) => x.id === l.id ? { ...x, amphoe: e.target.value } : x))} className={fieldCls} />
                <input value={l.tambon} placeholder="ตำบล" disabled={!canEdit} onChange={(e) => setLocs((p) => p.map((x) => x.id === l.id ? { ...x, tambon: e.target.value } : x))} className={fieldCls} />
              </div>
            </div>
          ))}
        </div>
        {canEdit && (
          <>
            <Button variant="secondary" className="w-full"
              onClick={() => { const id = `new-${seq}`; setSeq(seq + 1); setLocs((p) => [...p, { id, projectId, province: "", amphoe: "", tambon: "" }]); }}>
              <IconPlus size={18} /> เพิ่มพื้นที่
            </Button>
            <Button variant="primary" className="w-full" disabled={busy} onClick={persistEdits}>
              {busy ? "กำลังบันทึก…" : "💾 บันทึกการแก้ไขพื้นที่"}
            </Button>
          </>
        )}
      </Card>

      <Card className="space-y-3">
        <h3 className="border-l-4 border-success pl-2 font-display text-base font-semibold text-ink">ยืนยันพื้นที่</h3>
        {verifiedBy && verifiedAt ? (
          <div className="flex items-start gap-2 rounded-card bg-success-bg/50 p-3 text-sm text-success-fg">
            <IconShieldCheck size={20} className="mt-0.5 shrink-0" />
            <div>ยืนยันแล้วโดย <b>{verifiedBy}</b><br /><span className="text-ink-soft">เมื่อ {fmt(verifiedAt)}</span></div>
          </div>
        ) : (
          <p className="text-sm text-warning-fg">⚠️ ยังไม่ได้ยืนยันพื้นที่</p>
        )}
        {canEdit && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">ชื่อผู้ยืนยัน</label>
              <input value={verifierInput} onChange={(e) => setVerifierInput(e.target.value)} className={fieldCls} />
            </div>
            <Button variant="accent" className="w-full" disabled={busy} onClick={persistVerify}>
              <IconClipboardCheck size={18} /> {verifiedBy ? "ยืนยัน / อัปเดตอีกครั้ง" : "ยืนยันพื้นที่"}
            </Button>
          </>
        )}
      </Card>

      {savedMsg && <div className="rounded-card bg-success-bg/60 p-3 text-center text-sm font-medium text-success-fg">{savedMsg}</div>}

      {initialAudit.length > 0 && (
        <Card className="space-y-2">
          <button onClick={() => setShowAudit((s) => !s)} className="flex min-h-[44px] w-full items-center justify-between text-left">
            <h3 className="border-l-4 border-border-accent pl-2 font-display text-base font-semibold text-ink">ประวัติการแก้ไขพื้นที่</h3>
            <span className="text-sm text-ink-soft">{showAudit ? "ซ่อน" : `${initialAudit.length} รายการ`}</span>
          </button>
          {showAudit && (
            <ul className="space-y-2">
              {initialAudit.map((a, i) => (
                <li key={i} className="rounded-card border border-border p-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink">{AUDIT_LABEL[a.action] ?? a.action}</span>
                    <span className="shrink-0 text-xs text-ink-muted">{fmt(a.changedAt)}</span>
                  </div>
                  {auditDetail(a) && <div className="mt-0.5 break-words text-ink-soft">{auditDetail(a)}</div>}
                  {a.changedBy && <div className="text-xs text-ink-muted">โดย {a.changedBy}</div>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
