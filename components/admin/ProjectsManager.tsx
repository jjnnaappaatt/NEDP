"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { IconPlus, IconChevronDown, IconTrash, IconCheck, IconX, IconUserPlus, IconDatabaseImport, IconClipboardList, IconLink, IconCopy } from "@tabler/icons-react";
import type { AdminProject, HeadRequest, IntegrationRequest, QuestionnaireInfo, ProjectQuestionnaire, QuestionnaireRequest } from "@/lib/data";

const MODULE_OPTS = [{ key: "fall", label: "หกล้ม" }, { key: "bmd", label: "กระดูก (BMD)" }, { key: "nutrition", label: "โภชนาการ" }];

const fieldCls = "w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent";
const btn = "inline-flex items-center justify-center gap-1.5 rounded-card px-3 py-2 text-sm font-medium transition disabled:opacity-50";

async function postProjects(body: unknown): Promise<{ ok: boolean; error?: string; url?: string; accountName?: string }> {
  const res = await fetch("/api/admin/projects", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return res.json().catch(() => ({ ok: false }));
}

function HeadRequestRow({ hr, onDone }: { hr: HeadRequest; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  async function act(action: "approve" | "reject") {
    setBusy(true);
    const res = await fetch("/api/admin/head-requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, requestId: hr.requestId }),
    });
    setBusy(false);
    if (res.ok) onDone();
  }
  return (
    <div className="flex items-center justify-between gap-2 rounded-card bg-surface-soft px-3 py-2">
      <div className="min-w-0 text-sm">
        <span className="font-medium text-ink">{hr.requesterName}</span>
        <span className="text-ink-muted"> ขอเป็นหัวหน้า </span>
        <span className="truncate text-ink-soft">{hr.projectName}</span>
      </div>
      <div className="flex shrink-0 gap-1">
        <button onClick={() => act("approve")} disabled={busy} className={cn(btn, "bg-hero text-[var(--on-primary)]")}>
          <IconCheck size={14} /> อนุมัติ
        </button>
        <button onClick={() => act("reject")} disabled={busy} className={cn(btn, "border border-border text-ink-soft hover:bg-surface")}>
          <IconX size={14} />
        </button>
      </div>
    </div>
  );
}

function IntegrationRequestRow({ ir, onDone }: { ir: IntegrationRequest; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  async function act(action: "approve" | "reject") {
    setBusy(true);
    const res = await fetch("/api/admin/integration-requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, requestId: ir.requestId }),
    });
    setBusy(false);
    if (res.ok) onDone();
  }
  return (
    <div className="flex items-center justify-between gap-2 rounded-card bg-surface-soft px-3 py-2">
      <div className="min-w-0 text-sm">
        <span className="font-medium text-ink">{ir.requesterName || "ผู้ใช้"}</span>
        <span className="text-ink-muted"> ขอเปิดการนำเข้าแบบสอบถาม</span>
      </div>
      <div className="flex shrink-0 gap-1">
        <button onClick={() => act("approve")} disabled={busy} className={cn(btn, "bg-hero text-[var(--on-primary)]")}>
          <IconCheck size={14} /> อนุมัติ
        </button>
        <button onClick={() => act("reject")} disabled={busy} className={cn(btn, "border border-border text-ink-soft hover:bg-surface")}>
          <IconX size={14} />
        </button>
      </div>
    </div>
  );
}

function QuestionnaireRequestRow({ qr, onDone }: { qr: QuestionnaireRequest; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function act(action: "approve" | "reject") {
    setBusy(true); setErr(null);
    const res = await fetch("/api/admin/questionnaire-requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, requestId: qr.requestId }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && d.ok) onDone(); else setErr(d.error ?? "ไม่สำเร็จ");
  }
  return (
    <div className="rounded-card bg-surface-soft px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 text-sm">
          <span className="font-medium text-ink">{qr.title}</span>
          <span className="text-ink-muted"> · {qr.questionCount} ข้อ{qr.includeAai ? " + AAI" : ""} · โดย {qr.requesterName || "ผู้ใช้"}</span>
        </div>
        <div className="flex shrink-0 gap-1">
          <button onClick={() => act("approve")} disabled={busy} className={cn(btn, "bg-hero text-[var(--on-primary)]")}>
            <IconCheck size={14} /> อนุมัติ + กำหนด
          </button>
          <button onClick={() => act("reject")} disabled={busy} className={cn(btn, "border border-border text-ink-soft hover:bg-surface")}>
            <IconX size={14} />
          </button>
        </div>
      </div>
      {err && <p className="mt-1 text-xs text-warning-fg">{err}</p>}
    </div>
  );
}

function ProjectCard({ p, open, onToggle, onChanged, headRequests, integrationRequests, questionnaireRequests, questionnaires, assignment }: {
  p: AdminProject; open: boolean; onToggle: () => void; onChanged: () => void;
  headRequests: HeadRequest[]; integrationRequests: IntegrationRequest[]; questionnaireRequests: QuestionnaireRequest[];
  questionnaires: QuestionnaireInfo[]; assignment: ProjectQuestionnaire | null;
}) {
  const [edit, setEdit] = useState({ name: p.name, researcher: p.researcher ?? "", org: p.org ?? "", active: p.active });
  const [qSel, setQSel] = useState(assignment?.questionnaireId ?? "");
  const [qModules, setQModules] = useState<string[]>(assignment?.modules ?? []);
  const selKind = questionnaires.find((q) => q.id === qSel)?.kind;
  const qTitle = (id: string) => questionnaires.find((q) => q.id === id)?.title ?? id;
  const [members, setMembers] = useState<{ id: string; name: string }[] | null>(null);
  const [pick, setPick] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [claimLink, setClaimLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function makeClaimLink() {
    setBusy(true); setErr(null); setCopied(false);
    const r = await postProjects({ action: "claim-link", sourcePid: p.pid });
    setBusy(false);
    if (r.ok && r.url) setClaimLink(r.url);
    else setErr(r.error ?? "สร้างลิงก์ไม่สำเร็จ");
  }
  async function copyClaimLink() {
    if (!claimLink) return;
    try { await navigator.clipboard.writeText(claimLink); setCopied(true); } catch { /* ignore */ }
  }

  async function expand() {
    onToggle();
    if (!open && members === null && p.projectUuid) {
      const res = await fetch(`/api/admin/project-members?uuid=${encodeURIComponent(p.projectUuid)}`);
      const j = await res.json().catch(() => ({ members: [] }));
      setMembers(j.members ?? []);
    }
  }
  async function run(body: unknown) {
    setBusy(true); setErr(null);
    const r = await postProjects(body);
    setBusy(false);
    if (r.ok) onChanged(); else setErr(r.error ?? "ทำรายการไม่สำเร็จ");
    return r.ok;
  }

  return (
    <Card className="space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="line-clamp-2 font-medium text-ink">{p.name}</div>
          <div className="mt-0.5 truncate text-xs text-ink-muted">
            {p.researcher || p.org || "—"}{p.headName ? ` · หัวหน้า: ${p.headName}` : ""}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headRequests.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-ink">
              <IconUserPlus size={12} /> {headRequests.length} คำขอหัวหน้า
            </span>
          )}
          {integrationRequests.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-ink">
              <IconDatabaseImport size={12} /> {integrationRequests.length} คำขอนำเข้า
            </span>
          )}
          {questionnaireRequests.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-ink">
              <IconClipboardList size={12} /> {questionnaireRequests.length} คำขอแบบสอบถาม
            </span>
          )}
          {!p.active && <span className="rounded-full bg-surface-soft px-2 py-0.5 text-xs text-ink-muted">ปิด</span>}
          <button onClick={expand} className="inline-flex items-center gap-1 rounded-card border border-border px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-soft">
            จัดการ <IconChevronDown size={14} className={cn("transition", open && "rotate-180")} />
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t border-border pt-3">
          {/* Edit */}
          <div className="space-y-2">
            <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="ชื่อโครงการ" className={fieldCls} />
            <input value={edit.researcher} onChange={(e) => setEdit({ ...edit, researcher: e.target.value })} placeholder="ผู้รับผิดชอบ" className={fieldCls} />
            <input value={edit.org} onChange={(e) => setEdit({ ...edit, org: e.target.value })} placeholder="หน่วยงาน" className={fieldCls} />
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
              เปิดใช้งาน (รับการแจ้งเตือน)
            </label>
            <button disabled={busy} onClick={() => run({ action: "update", pid: p.pid, ...edit })} className={cn(btn, "bg-hero text-[var(--on-primary)]")}>
              บันทึกการแก้ไข
            </button>
          </div>

          {/* Head / avatar */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="text-xs font-medium text-ink-soft">หัวหน้าโครงการ / รูปโครงการ</div>
            {headRequests.length > 0 && (
              <div className="space-y-1.5 rounded-card border border-accent/40 bg-accent-soft/40 p-2">
                <div className="flex items-center gap-1 text-xs font-medium text-ink">
                  <IconUserPlus size={13} /> คำขอเป็นหัวหน้าโครงการ (จากผู้ใช้)
                </div>
                {headRequests.map((hr) => <HeadRequestRow key={hr.requestId} hr={hr} onDone={onChanged} />)}
              </div>
            )}
            {integrationRequests.length > 0 && (
              <div className="space-y-1.5 rounded-card border border-accent/40 bg-accent-soft/40 p-2">
                <div className="flex items-center gap-1 text-xs font-medium text-ink">
                  <IconDatabaseImport size={13} /> คำขอเปิดการนำเข้าแบบสอบถาม
                </div>
                {integrationRequests.map((ir) => <IntegrationRequestRow key={ir.requestId} ir={ir} onDone={onChanged} />)}
              </div>
            )}
            {p.projectUuid == null ? (
              <p className="text-xs text-ink-muted">โครงการนี้ยังไม่ได้ซิงค์กับเว็บ</p>
            ) : members && members.length === 0 ? (
              <p className="text-xs text-ink-muted">ยังไม่มีสมาชิกที่ลงทะเบียน</p>
            ) : (
              <>
                <select value={pick} onChange={(e) => setPick(e.target.value)} className={fieldCls}>
                  <option value="">— เลือกสมาชิก —</option>
                  {(members ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <div className="flex flex-wrap gap-1.5">
                  <button disabled={busy || !pick} onClick={() => run({ action: "head", sourcePid: p.pid, accountId: pick })} className={cn(btn, "border border-border text-ink-soft hover:bg-surface-soft")}>ตั้งเป็นหัวหน้า</button>
                  <button disabled={busy || !pick} onClick={() => run({ action: "avatar", sourcePid: p.pid, accountId: pick })} className={cn(btn, "border border-border text-ink-soft hover:bg-surface-soft")}>ตั้งเป็นรูปโครงการ</button>
                  <button disabled={busy} onClick={() => run({ action: "head", sourcePid: p.pid, accountId: null })} className={cn(btn, "text-ink-muted hover:bg-surface-soft")}>เอาหัวหน้าออก</button>
                </div>
              </>
            )}
            {/* Claim link — invite the researcher to bind their LINE to this project's placeholder account */}
            <div className="space-y-1.5 border-t border-border/60 pt-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-medium text-ink-soft">เชื่อมบัญชีนักวิจัยกับ LINE</div>
                <button disabled={busy} onClick={makeClaimLink} className={cn(btn, "border border-border text-ink-soft hover:bg-surface-soft")}>
                  <IconLink size={13} className="mr-1 inline" /> สร้างลิงก์เชื่อม
                </button>
              </div>
              {claimLink && (
                <div className="flex items-center gap-1.5 rounded-card border border-border bg-surface-soft p-1.5">
                  <input readOnly value={claimLink} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 bg-transparent px-1 text-xs text-ink-soft outline-none" />
                  <button onClick={copyClaimLink} className="inline-flex shrink-0 items-center gap-1 rounded-card bg-hero px-2 py-1 text-xs font-medium text-[var(--on-primary)]">
                    {copied ? <><IconCheck size={12} /> คัดลอกแล้ว</> : <><IconCopy size={12} /> คัดลอก</>}
                  </button>
                </div>
              )}
              <p className="text-[11px] text-ink-muted">ส่งลิงก์ให้นักวิจัยเปิดและเข้าสู่ระบบด้วย LINE เพื่อรับบัญชีโครงการ (ชื่อ/หน่วยงาน/การลงทะเบียนเดิม)</p>
            </div>
          </div>

          {/* Questionnaire assignment */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="text-xs font-medium text-ink-soft">แบบสอบถามของโครงการ</div>
            {questionnaireRequests.length > 0 && (
              <div className="space-y-1.5 rounded-card border border-accent/40 bg-accent-soft/40 p-2">
                <div className="flex items-center gap-1 text-xs font-medium text-ink">
                  <IconClipboardList size={13} /> คำขอเพิ่มแบบสอบถาม (จากหัวหน้าโครงการ) — อนุมัติแล้วระบบจะกำหนดให้อัตโนมัติ
                </div>
                {questionnaireRequests.map((qr) => <QuestionnaireRequestRow key={qr.requestId} qr={qr} onDone={onChanged} />)}
              </div>
            )}
            {assignment
              ? <div className="text-xs text-ink-soft">ปัจจุบัน: <b className="text-ink">{qTitle(assignment.questionnaireId)}</b>{assignment.modules.length ? ` · โมดูล: ${assignment.modules.join(", ")}` : ""}</div>
              : <div className="text-xs text-ink-muted">ยังไม่ได้กำหนดแบบสอบถาม</div>}
            {p.projectUuid == null ? (
              <p className="text-xs text-ink-muted">โครงการนี้ยังไม่ได้ซิงค์กับเว็บ</p>
            ) : questionnaires.length === 0 ? (
              <p className="text-xs text-ink-muted">ยังไม่มีแบบสอบถามในระบบ — กด “ซิงค์แบบสอบถาม” ด้านบน</p>
            ) : (
              <>
                <select value={qSel} onChange={(e) => setQSel(e.target.value)} className={fieldCls}>
                  <option value="">— เลือกแบบสอบถาม —</option>
                  {questionnaires.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
                </select>
                {selKind === "clinical" && (
                  <div className="flex flex-wrap gap-3 text-xs text-ink-soft">
                    <span className="text-ink-muted">โมดูล (ข้อมูลทั่วไปรวมเสมอ):</span>
                    {MODULE_OPTS.map((m) => (
                      <label key={m.key} className="flex items-center gap-1">
                        <input type="checkbox" checked={qModules.includes(m.key)}
                          onChange={(e) => setQModules(e.target.checked ? [...qModules, m.key] : qModules.filter((x) => x !== m.key))}
                          className="h-4 w-4 accent-[var(--accent)]" />
                        {m.label}
                      </label>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <button disabled={busy || !qSel} onClick={() => run({ action: "assign-questionnaire", projectId: p.projectUuid, questionnaireId: qSel, modules: qModules })} className={cn(btn, "bg-hero text-[var(--on-primary)]")}>กำหนดแบบสอบถาม</button>
                  {assignment && <button disabled={busy} onClick={() => run({ action: "unassign-questionnaire", projectId: p.projectUuid })} className={cn(btn, "text-ink-muted hover:bg-surface-soft")}>ยกเลิก</button>}
                </div>
              </>
            )}
          </div>

          {/* Delete */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="text-xs font-medium text-danger-fg">ลบโครงการถาวร (ลบข้อมูลทั้งหมด)</div>
            <div className="flex items-center gap-2">
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder='พิมพ์ "ลบ" เพื่อยืนยัน' className={cn(fieldCls, "max-w-[200px]")} />
              <button disabled={busy || confirm !== "ลบ"} onClick={() => run({ action: "delete", pid: p.pid })} className={cn(btn, "bg-danger text-white")}>
                <IconTrash size={14} /> ลบถาวร
              </button>
            </div>
          </div>

          {err && <p className="text-sm text-danger-fg">{err}</p>}
        </div>
      )}
    </Card>
  );
}

export function ProjectsManager({ initial, headRequests, integrationRequests = [], questionnaireRequests = [], questionnaires = [], projectQuestionnaires = [] }: {
  initial: AdminProject[]; headRequests: HeadRequest[]; integrationRequests?: IntegrationRequest[];
  questionnaireRequests?: QuestionnaireRequest[];
  questionnaires?: QuestionnaireInfo[]; projectQuestionnaires?: ProjectQuestionnaire[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", researcher: "", org: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [openPid, setOpenPid] = useState<number | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function syncQuestionnaires() {
    setSyncMsg("กำลังซิงค์…");
    const res = await fetch("/api/admin/questionnaires/sync", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setSyncMsg(d.ok ? `ซิงค์แบบสอบถามแล้ว (${d.synced})` : "ซิงค์ไม่สำเร็จ");
    if (d.ok) router.refresh();
  }

  async function create() {
    if (!form.name.trim()) return;
    setBusy(true); setErr(null);
    const r = await postProjects({ action: "create", ...form });
    setBusy(false);
    if (r.ok) { setForm({ name: "", researcher: "", org: "" }); setCreating(false); router.refresh(); }
    else setErr(r.error ?? "เพิ่มไม่สำเร็จ");
  }

  return (
    <div className="space-y-4">
      {!creating ? (
        <button onClick={() => setCreating(true)} className={cn(btn, "border border-dashed border-border text-ink-soft hover:bg-surface-soft")}>
          <IconPlus size={16} /> เพิ่มโครงการ
        </button>
      ) : (
        <Card className="space-y-2">
          <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ชื่อโครงการ *" className={fieldCls} />
          <input value={form.researcher} onChange={(e) => setForm({ ...form, researcher: e.target.value })} placeholder="ผู้รับผิดชอบ" className={fieldCls} />
          <input value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} placeholder="หน่วยงาน" className={fieldCls} />
          {err && <p className="text-sm text-danger-fg">{err}</p>}
          <div className="flex gap-2">
            <button disabled={busy || !form.name.trim()} onClick={create} className={cn(btn, "bg-hero text-[var(--on-primary)]")}>เพิ่มโครงการ</button>
            <button onClick={() => { setCreating(false); setErr(null); }} className={cn(btn, "text-ink-soft hover:bg-surface-soft")}>ยกเลิก</button>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <button onClick={syncQuestionnaires} className={cn(btn, "border border-border text-ink-soft hover:bg-surface-soft")}>
          ซิงค์แบบสอบถาม
        </button>
        {syncMsg && <span className="text-xs text-ink-muted">{syncMsg}</span>}
      </div>

      <div className="space-y-2">
        {initial.map((p) => (
          <ProjectCard key={p.pid} p={p} open={openPid === p.pid}
            onToggle={() => setOpenPid(openPid === p.pid ? null : p.pid)} onChanged={() => router.refresh()}
            headRequests={headRequests.filter((hr) => hr.sourceProjectId === p.pid)}
            integrationRequests={integrationRequests.filter((ir) => ir.sourceProjectId === p.pid)}
            questionnaireRequests={questionnaireRequests.filter((qr) => qr.sourceProjectId === p.pid)}
            questionnaires={questionnaires}
            assignment={projectQuestionnaires.find((pq) => pq.projectId === p.projectUuid) ?? null} />
        ))}
      </div>
    </div>
  );
}
