"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/forms/ProgressBar";
import { MonthlyReportForm } from "@/components/forms/MonthlyReportForm";
import { cn } from "@/lib/utils";
import {
  IconMapPin, IconCircleCheck, IconChevronRight, IconPencil, IconPlus, IconTrash,
  IconArrowLeft, IconShieldCheck, IconClipboardCheck,
} from "@tabler/icons-react";
import type { LocationAuditEntry, LocationVerification, ProjectLocation, ProjectTemplate } from "@/types";

type Mode = { t: "list" } | { t: "fill"; id: string } | { t: "manage" };
type SubmissionState = { id: string; status: string; data: Record<string, string>; locked: boolean; editRequested: boolean };
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
  "min-h-[44px] w-full rounded-card border border-border bg-surface px-3 text-base text-ink outline-none focus:border-border-accent focus:ring-2 focus:ring-border-accent/30";

/**
 * Per-location submission flow (spec §5 + project requirement): the user must SELECT a location
 * first, then submit it; the project is "done" only when EVERY location is submitted. Also lets
 * the user VERIFY & EDIT the project's location list (who/when, editable / re-verifiable).
 */
export function LocationPanel({
  template,
  initialLocations,
  initialDoneIds,
  initialVerification,
  initialAudit,
  meName,
  canEdit,
  submissions,
  hints,
  startManage,
  allowManage = true,
}: {
  template: ProjectTemplate;
  initialLocations: ProjectLocation[];
  initialDoneIds: string[];
  initialVerification: LocationVerification | null;
  initialAudit: LocationAuditEntry[];
  meName: string;
  canEdit: boolean;
  /** My current submission state per location (prefill + lock/edit-request flags). */
  submissions?: Record<string, SubmissionState>;
  /** Previous-month values per location, shown as form placeholders. */
  hints?: Record<string, Record<string, string>>;
  /** Open straight into ยืนยันพื้นที่ (manage) mode — used right after registering. */
  startManage?: boolean;
  /** When false (the ส่งข้อมูล entry portal), hide location-list editing/verify — that lives in สถานะ/จัดการ. */
  allowManage?: boolean;
}) {
  const [locs, setLocs] = useState<ProjectLocation[]>(initialLocations);
  const [done, setDone] = useState<Set<string>>(new Set(initialDoneIds));
  const [subs, setSubs] = useState<Record<string, SubmissionState>>(submissions ?? {});
  const [verifiedBy, setVerifiedBy] = useState<string | null>(initialVerification?.verifiedBy ?? null);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(initialVerification?.verifiedAt ?? null);
  const [verifierInput, setVerifierInput] = useState(initialVerification?.verifiedBy ?? meName);
  const [mode, setMode] = useState<Mode>(startManage && allowManage ? { t: "manage" } : { t: "list" });
  const [seq, setSeq] = useState(1);
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  async function persistEdits() {
    setBusy(true);
    setSavedMsg(null);
    try {
      const res = await fetch("/api/save-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: template.projectId, locations: locs, editedBy: meName }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; blocked?: string[] };
      if (data.blocked?.length) {
        setSavedMsg(`บันทึกแล้ว · ลบไม่ได้ (มีข้อมูลส่งแล้ว): ${data.blocked.join(", ")}`);
      } else {
        setSavedMsg("บันทึกการแก้ไขแล้ว ✓");
      }
      if (typeof window !== "undefined") setTimeout(() => window.location.reload(), 950);
    } catch {
      setSavedMsg("บันทึกไม่สำเร็จ — ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  async function persistVerify() {
    const by = verifierInput.trim() || meName;
    setVerifiedBy(by);
    setVerifiedAt(new Date().toISOString());
    setBusy(true);
    setSavedMsg(null);
    try {
      await fetch("/api/verify-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: template.projectId, verifiedBy: by }),
      });
      setSavedMsg("ยืนยันและบันทึกแล้ว ✓");
    } catch {
      setSavedMsg("บันทึกไม่สำเร็จ — ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  // ── Location-list edit-lock: after ยืนยัน, editing the list needs admin approval (ขอแก้ไขพื้นที่) ──
  const [editReqSent, setEditReqSent] = useState(initialVerification?.editRequested ?? false);
  const locLocked = (initialVerification?.editLocked ?? false); // verified & no open edit-window
  const editable = !locLocked;                                  // free to edit when not verified or approved
  async function requestLocationEdit() {
    setBusy(true); setSavedMsg(null);
    try {
      const res = await fetch("/api/request-edit-locations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: template.projectId }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (res.ok && d.ok) { setEditReqSent(true); setSavedMsg("ส่งคำขอแก้ไขแล้ว — รอผู้ดูแลอนุมัติ"); }
      else setSavedMsg("ส่งคำขอไม่สำเร็จ — ลองใหม่อีกครั้ง");
    } finally { setBusy(false); }
  }

  const total = locs.length;
  const doneCount = locs.filter((l) => done.has(l.id)).length;
  const allDone = total > 0 && doneCount === total;
  const labelOf = (l: ProjectLocation) => `${l.tambon} · ${l.amphoe}, ${l.province}`;

  // ── FILL one location ──
  const sel = mode.t === "fill" ? locs.find((l) => l.id === mode.id) : undefined;
  if (mode.t === "fill" && sel) {
    const st = subs[sel.id];
    const post = (url: string, extra: Record<string, unknown>) =>
      fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: template.projectId, locationId: sel.id, ...extra }),
      });
    const okOf = async (res: Response | null) => {
      if (!res) return false;
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean };
      return res.ok && d.ok === true;
    };
    const backToList = () => {
      setMode({ t: "list" });
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    };
    return (
      <div className="space-y-4">
        <button onClick={() => setMode({ t: "list" })} className="inline-flex items-center gap-1 text-sm font-medium text-ink-accent min-h-[44px] -ml-2 px-2">
          <IconArrowLeft size={16} /> เลือกพื้นที่อื่น
        </button>
        <Card className="flex items-center gap-3 bg-accent-soft/50">
          <span className="icon-badge" style={{ background: "var(--accent-soft)", color: "var(--text-accent)" }}><IconMapPin size={22} /></span>
          <div className="min-w-0">
            <div className="text-xs text-ink-muted">กำลังกรอกข้อมูลพื้นที่</div>
            <div className="truncate font-display font-semibold text-ink">{labelOf(sel)}</div>
          </div>
        </Card>
        <MonthlyReportForm
          key={sel.id}
          initialValues={st?.data}
          hints={hints?.[sel.id]}
          locked={st?.locked ?? false}
          editRequested={st?.editRequested ?? false}
          onSaveDraft={async (values) => {
            await post("/api/save-draft-location", { values }).catch(() => null);
            setSubs((p) => ({ ...p, [sel.id]: { id: p[sel.id]?.id ?? "", status: "draft", data: values, locked: false, editRequested: false } }));
            backToList();
          }}
          onSubmit={async (values) => {
            const ok = await okOf(await post("/api/submit-location", { values }).catch(() => null));
            if (!ok) { if (typeof window !== "undefined") window.alert("ส่งข้อมูลไม่สำเร็จ — ลองใหม่อีกครั้ง"); return; }
            setSubs((p) => ({ ...p, [sel.id]: { id: p[sel.id]?.id ?? "", status: "submitted", data: values, locked: true, editRequested: false } }));
            setDone((p) => { const n = new Set(p); n.add(sel.id); return n; });
            backToList();
          }}
          onRequestEdit={async () => {
            const ok = await okOf(await post("/api/request-edit", {}).catch(() => null));
            if (!ok) { if (typeof window !== "undefined") window.alert("ส่งคำขอไม่สำเร็จ — ลองใหม่อีกครั้ง"); return; }
            setSubs((p) => ({ ...p, [sel.id]: { ...(p[sel.id] as SubmissionState), editRequested: true } }));
          }}
        />
      </div>
    );
  }

  // ── MANAGE: edit + verify the location list ──
  if (mode.t === "manage") {
    return (
      <div className="space-y-4">
        <button onClick={() => setMode({ t: "list" })} className="inline-flex items-center gap-1 text-sm font-medium text-ink-accent min-h-[44px] -ml-2 px-2">
          <IconArrowLeft size={16} /> กลับ
        </button>

        {locLocked && (
          <Card className="space-y-2 border-warning/40 bg-warning-bg/50">
            <div className="flex items-start gap-2 text-sm text-warning-fg">
              <IconShieldCheck size={20} className="mt-0.5 shrink-0" />
              <div>
                พื้นที่นี้ <b>ยืนยันแล้ว</b> — การแก้ไขรายการพื้นที่ต้องได้รับอนุมัติจากผู้ดูแลระบบก่อน
                {editReqSent && <><br /><span className="text-ink-soft">ส่งคำขอแล้ว · รอผู้ดูแลอนุมัติ</span></>}
              </div>
            </div>
            {!editReqSent && (
              <Button variant="secondary" className="w-full" disabled={busy} onClick={requestLocationEdit}>
                {busy ? "กำลังส่ง…" : "✎ ขอแก้ไขพื้นที่"}
              </Button>
            )}
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
                  <button disabled={!editable} onClick={() => setLocs((p) => p.filter((x) => x.id !== l.id))} className="inline-flex items-center gap-1 text-xs font-medium text-danger min-h-[44px] min-w-[44px] justify-center px-2 disabled:opacity-40">
                    <IconTrash size={14} /> ลบ
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input disabled={!editable} value={l.province} placeholder="จังหวัด" onChange={(e) => setLocs((p) => p.map((x) => x.id === l.id ? { ...x, province: e.target.value } : x))} className={fieldCls} />
                  <input disabled={!editable} value={l.amphoe} placeholder="อำเภอ" onChange={(e) => setLocs((p) => p.map((x) => x.id === l.id ? { ...x, amphoe: e.target.value } : x))} className={fieldCls} />
                  <input disabled={!editable} value={l.tambon} placeholder="ตำบล" onChange={(e) => setLocs((p) => p.map((x) => x.id === l.id ? { ...x, tambon: e.target.value } : x))} className={fieldCls} />
                </div>
              </div>
            ))}
          </div>
          <Button
            variant="secondary"
            className="w-full"
            disabled={!editable}
            onClick={() => { const id = `new-${seq}`; setSeq(seq + 1); setLocs((p) => [...p, { id, projectId: template.projectId, province: "", amphoe: "", tambon: "" }]); }}
          >
            <IconPlus size={18} /> เพิ่มพื้นที่
          </Button>
          <Button variant="primary" className="w-full" disabled={busy || !editable} onClick={persistEdits}>
            {busy ? "กำลังบันทึก…" : "💾 บันทึกการแก้ไขพื้นที่"}
          </Button>
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
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">ชื่อผู้ยืนยัน</label>
            <input value={verifierInput} onChange={(e) => setVerifierInput(e.target.value)} className={fieldCls} />
          </div>
          <Button variant="accent" className="w-full" disabled={busy || !editable} onClick={persistVerify}>
            <IconClipboardCheck size={18} /> {verifiedBy ? "ยืนยัน / อัปเดตอีกครั้ง" : "ยืนยันพื้นที่"}
          </Button>
        </Card>

        {savedMsg && (
          <div className="rounded-card bg-success-bg/60 p-3 text-center text-sm font-medium text-success-fg">{savedMsg}</div>
        )}

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

        <Button variant="primary" className="w-full" onClick={() => setMode({ t: "list" })}>เสร็จสิ้น</Button>
      </div>
    );
  }

  // ── LIST: pick a location to submit ──
  return (
    <div className="space-y-4">
      <ProgressBar filled={doneCount} total={total} label="ส่งแล้ว" unit="พื้นที่" />

      {!canEdit && (
        <Card className="border-warning/40 bg-warning-bg p-3 text-sm text-warning-fg">
          👁️ ดูแบบอ่านอย่างเดียว — ต้อง{" "}
          <Link href="/register" className="font-semibold underline">ลงทะเบียนเป็นผู้ติดต่อ</Link>{" "}
          ของโครงการนี้ก่อน จึงจะส่ง/แก้ไขข้อมูลได้
        </Card>
      )}

      {allDone && (
        <Card className="flex items-center gap-3 border-success/40 bg-success-bg/40 animate-pop">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-success-bg text-success-fg"><IconCircleCheck size={26} /></span>
          <div>
            <div className="font-display font-semibold text-ink">ส่งครบทุกพื้นที่แล้ว ✓</div>
            <div className="text-sm text-ink-soft">โครงการนี้เสร็จสมบูรณ์สำหรับรอบนี้</div>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink-soft">{canEdit ? "เลือกพื้นที่เพื่อกรอกข้อมูล — ต้องส่งครบทุกพื้นที่" : "สถานะการส่งของแต่ละพื้นที่"}</p>
        {canEdit && allowManage && (
          <button onClick={() => setMode({ t: "manage" })} className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-card border border-border px-2.5 py-2.5 min-h-[44px] text-sm font-medium text-ink-soft hover:bg-surface-soft">
            <IconPencil size={16} /> แก้ไข/ยืนยันพื้นที่
          </button>
        )}
      </div>

      {!allowManage ? null : verifiedBy ? (
        <div className="flex items-center gap-1.5 text-xs font-medium text-success-fg"><IconShieldCheck size={14} /> ยืนยันพื้นที่แล้วโดย {verifiedBy}</div>
      ) : (
        <div className="text-xs font-medium text-warning-fg">⚠️ ยังไม่ยืนยันพื้นที่ — กด “แก้ไข/ยืนยันพื้นที่”</div>
      )}

      <div className="space-y-2">
        {locs.map((l) => {
          const ok = done.has(l.id);
          const draft = !ok && subs[l.id]?.status === "draft";
          return (
            <button key={l.id} onClick={() => setMode({ t: "fill", id: l.id })} disabled={!canEdit} className={cn("card flex w-full items-center gap-3 p-3 text-left transition", canEdit ? "hover:border-border-accent" : "cursor-default", ok && "bg-success-bg/30")}>
              <span className="icon-badge" style={ok ? { background: "#16a34a1a", color: "#16a34a" } : { background: "var(--accent-soft)", color: "var(--text-accent)" }}>
                {ok ? <IconCircleCheck size={22} /> : <IconMapPin size={22} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-ink">{l.tambon || "(ยังไม่ระบุตำบล)"}</div>
                <div className="truncate text-xs text-ink-muted">{l.amphoe}{l.amphoe && l.province ? ", " : ""}{l.province}</div>
              </div>
              <span className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium", ok ? "bg-success-bg text-success-fg" : draft ? "bg-surface-soft text-ink-soft" : "bg-warning-bg text-warning-fg")}>
                {ok ? "✓ ส่งแล้ว" : draft ? "ร่าง" : "ยังไม่ส่ง"}
              </span>
              <IconChevronRight size={18} className="shrink-0 text-ink-muted" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
