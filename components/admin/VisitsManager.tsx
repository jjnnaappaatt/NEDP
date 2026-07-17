"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { IconPlus, IconSend, IconX, IconUsers, IconChevronDown } from "@tabler/icons-react";
import { nearestProvinces, sortByDistanceFrom } from "@/lib/geo/provinceCentroids";
import type { SiteVisit, VisitRsvp } from "@/lib/data";

const AUTO_SELECT_N = 5; // choosing a host auto-selects its 5 nearest target provinces (admin can deselect)

const fieldCls = "w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent";
const btn = "inline-flex items-center justify-center gap-1.5 rounded-card px-3 py-2 text-sm font-medium transition disabled:opacity-50";
const STATUS_CLS: Record<string, string> = {
  draft: "bg-surface-soft text-ink-soft", sent: "bg-success-bg text-success-fg", cancelled: "bg-danger-bg text-danger-fg",
};

async function postVisits(body: unknown): Promise<{ ok?: boolean; sent?: number; failed?: number; error?: string }> {
  const res = await fetch("/api/admin/visits", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return res.json().catch(() => ({ ok: false }));
}

function CreateForm({ provinces, onDone }: { provinces: string[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", hostProvince: "", venue: "", when: "", details: "", imageUrl: "" });
  const [targets, setTargets] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggle = (p: string) => setTargets((s) => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n; });
  async function onImage(file: File | null) {
    if (!file) return;
    setUploading(true); setErr(null);
    const fd = new FormData(); fd.set("image", file);
    const res = await fetch("/api/admin/visit-image", { method: "POST", body: fd });
    const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    setUploading(false);
    if (res.ok && j.url) setF((prev) => ({ ...prev, imageUrl: j.url! }));
    else setErr(j.error === "file too large" ? "ไฟล์ภาพใหญ่เกินไป (สูงสุด 5MB)" : "อัปโหลดรูปไม่สำเร็จ");
  }
  // Choosing a host auto-selects its nearest target provinces (by distance); the admin prunes with the chips below.
  const onHost = (host: string) => {
    setF((prev) => ({ ...prev, hostProvince: host }));
    setTargets(new Set(host ? nearestProvinces(host, provinces, AUTO_SELECT_N) : []));
  };
  async function submit() {
    if (!f.title.trim()) return;
    setBusy(true); setErr(null);
    const r = await postVisits({ action: "create", ...f, imageUrl: f.imageUrl || undefined, targetProvinces: [...targets] });
    setBusy(false);
    if (r.ok) {
      setF({ title: "", hostProvince: "", venue: "", when: "", details: "", imageUrl: "" });
      setTargets(new Set()); if (fileRef.current) fileRef.current.value = ""; setOpen(false); onDone();
    } else setErr(r.error ?? "สร้างไม่สำเร็จ");
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className={cn(btn, "border border-dashed border-border text-ink-soft hover:bg-surface-soft")}>
      <IconPlus size={16} /> สร้างการลงพื้นที่
    </button>
  );
  return (
    <Card className="space-y-2">
      <input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="หัวข้อ *" className={fieldCls} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select value={f.hostProvince} onChange={(e) => onHost(e.target.value)} className={fieldCls}>
          <option value="">— จังหวัดเจ้าภาพ —</option>
          {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <input value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} placeholder="วันเวลา (เช่น 15 ส.ค. 2569 09:00)" className={fieldCls} />
      </div>
      <input value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} placeholder="สถานที่" className={fieldCls} />
      <textarea value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} placeholder="รายละเอียด" rows={2} className={fieldCls} />
      <div>
        <div className="mb-1 text-xs font-medium text-ink-soft">แนบรูปภาพ (ไม่บังคับ) — แสดงบนการ์ดเชิญใน LINE</div>
        {f.imageUrl ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.imageUrl} alt="ตัวอย่างรูป" className="h-16 w-24 rounded-card border border-border object-cover" />
            <button type="button" onClick={() => { setF((p) => ({ ...p, imageUrl: "" })); if (fileRef.current) fileRef.current.value = ""; }}
              className="text-xs text-danger-fg hover:underline">ลบรูป</button>
          </div>
        ) : (
          <input ref={fileRef} type="file" accept="image/*" disabled={uploading}
            onChange={(e) => onImage(e.target.files?.[0] ?? null)}
            className="w-full text-xs text-ink-soft file:mr-2 file:rounded file:border-0 file:bg-accent-soft file:px-2 file:py-1 file:text-xs file:font-medium file:text-ink" />
        )}
        {uploading && <p className="mt-1 text-xs text-ink-muted">กำลังอัปโหลด…</p>}
      </div>
      <div>
        <div className="mb-1 text-xs font-medium text-ink-soft">
          จังหวัดเป้าหมาย (ผู้รับเชิญ) — {targets.size} จังหวัด
          {f.hostProvince && <span className="text-ink-muted"> · เลือกใกล้ที่สุดให้อัตโนมัติ แตะเพื่อปรับ</span>}
        </div>
        <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-card border border-border p-2">
          {sortByDistanceFrom(f.hostProvince, provinces).map((p) => (
            <button key={p} onClick={() => toggle(p)} type="button"
              className={cn("rounded-full border px-2.5 py-1 text-xs transition",
                targets.has(p) ? "border-accent bg-accent-soft text-ink" : "border-border text-ink-muted hover:bg-surface-soft")}>
              {p}
            </button>
          ))}
        </div>
      </div>
      {err && <p className="text-sm text-danger-fg">{err}</p>}
      <div className="flex gap-2">
        <button disabled={busy || !f.title.trim()} onClick={submit} className={cn(btn, "bg-hero text-[var(--on-primary)]")}>บันทึก (ร่าง)</button>
        <button onClick={() => { setOpen(false); setErr(null); }} className={cn(btn, "text-ink-soft hover:bg-surface-soft")}>ยกเลิก</button>
      </div>
    </Card>
  );
}

function VisitCard({ v, onChanged }: { v: SiteVisit; onChanged: () => void }) {
  const [busy, setBusy] = useState<null | "send" | "cancel">(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [rsvps, setRsvps] = useState<VisitRsvp[] | null>(null);
  const [openRsvp, setOpenRsvp] = useState(false);

  async function act(action: "send" | "cancel") {
    setBusy(action); setMsg(null);
    const r = await postVisits({ action, id: v.id });
    setBusy(null);
    if (action === "send") {
      const errMsg: Record<string, string> = {
        line_token_not_set: "ยังไม่ได้ตั้งค่า LINE token",
        no_recipients: "ไม่มีผู้ติดต่อ LINE ในจังหวัดเป้าหมาย",
        no_projects_in_provinces: "ไม่มีโครงการในจังหวัดเป้าหมาย",
        no_target_provinces: "ยังไม่ได้เลือกจังหวัดเป้าหมาย",
      };
      if (r.ok || (r.sent ?? 0) > 0) { setMsg(`ส่งแล้ว ${r.sent ?? 0}${r.failed ? ` · ล้มเหลว ${r.failed}` : ""}`); onChanged(); }
      else setMsg((r.error && errMsg[r.error]) ?? r.error ?? "ส่งไม่สำเร็จ");
    } else if (r.ok) onChanged();
  }
  async function loadRsvps() {
    setOpenRsvp((o) => !o);
    if (rsvps === null) {
      const res = await fetch(`/api/admin/visits?rsvps=${v.id}`);
      const j = await res.json().catch(() => ({ rsvps: [] }));
      setRsvps(j.rsvps ?? []);
    }
  }

  return (
    <Card className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-ink">{v.title}</div>
          <div className="mt-0.5 text-xs text-ink-muted">
            {v.hostProvince && `${v.hostProvince} · `}{v.when || "—"}{v.venue ? ` · ${v.venue}` : ""}
          </div>
          {v.targetProvinces.length > 0 && (
            <div className="mt-1 text-xs text-ink-muted">เป้าหมาย: {v.targetProvinces.join(", ")}</div>
          )}
          {v.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={v.imageUrl} alt="รูปการ์ดเชิญ" className="mt-1.5 h-20 w-full max-w-[220px] rounded-card border border-border object-cover" />
          )}
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", STATUS_CLS[v.status] ?? "bg-surface-soft text-ink-soft")}>
          {v.status}
        </span>
      </div>

      {v.status === "sent" && (
        <div className="flex flex-wrap gap-3 text-xs text-ink-soft">
          <span>ส่ง {v.sentCount}/{v.recipientCount}</span>
          <span className="text-success-fg">จะเข้าร่วม {v.yesCount}</span>
          <span className="text-ink-muted">ไม่สะดวก {v.noCount}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
        {v.status !== "cancelled" && (
          <button onClick={() => act("send")} disabled={busy !== null} className={cn(btn, "border border-accent bg-accent-soft text-ink hover:bg-accent-soft/70")}>
            <IconSend size={14} /> {v.status === "sent" ? "ส่งอีกครั้ง" : "ส่งคำเชิญ"}
          </button>
        )}
        {v.status === "sent" && (
          <button onClick={loadRsvps} className={cn(btn, "border border-border text-ink-soft hover:bg-surface-soft")}>
            <IconUsers size={14} /> ผู้ตอบรับ <IconChevronDown size={13} className={cn("transition", openRsvp && "rotate-180")} />
          </button>
        )}
        {v.status !== "cancelled" && (
          <button onClick={() => act("cancel")} disabled={busy !== null} className={cn(btn, "text-danger-fg hover:bg-surface-soft")}>
            <IconX size={14} /> ยกเลิก
          </button>
        )}
        {busy && <span className="text-xs text-ink-muted">กำลังทำรายการ…</span>}
        {msg && <span className="text-xs font-medium text-ink-soft">{msg}</span>}
      </div>

      {openRsvp && rsvps && (
        <div className="space-y-1 border-t border-border pt-2">
          {rsvps.length === 0 ? <p className="text-xs text-ink-muted">ยังไม่มีผู้ตอบรับ</p> : rsvps.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-ink">{r.contactName || "—"}{r.projectNames ? ` · ${r.projectNames}` : ""}</span>
              <span className={cn("shrink-0 font-medium", r.response === "yes" ? "text-success-fg" : "text-ink-muted")}>
                {r.response === "yes" ? "จะเข้าร่วม" : "ไม่สะดวก"}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function VisitsManager({ initial, provinces }: { initial: SiteVisit[]; provinces: string[] }) {
  const router = useRouter();
  const refresh = () => router.refresh();
  return (
    <div className="space-y-4">
      <CreateForm provinces={provinces} onDone={refresh} />
      {initial.length === 0 ? (
        <Card className="p-8 text-center text-ink-soft">ยังไม่มีการลงพื้นที่</Card>
      ) : (
        <div className="space-y-2">{initial.map((v) => <VisitCard key={v.id} v={v} onChanged={refresh} />)}</div>
      )}
    </div>
  );
}
