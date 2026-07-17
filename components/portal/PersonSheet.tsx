"use client";

import { useEffect, useState } from "react";
import { IconClipboardList } from "@tabler/icons-react";
import { Sheet } from "@/components/ui/Sheet";
import { PersonDomainForm } from "@/components/portal/PersonDomainForm";
import { QuestionnaireEntry } from "@/components/questionnaire/QuestionnaireEntry";
import { SummaryBox } from "./SummaryBox";
import { DimensionHighlightCards } from "./DimensionHighlightCards";
import { aaiDelta, strongestWeakest } from "@/lib/aai/insights";
import type { PersonDetail } from "@/lib/data";
import type { QuestionnaireSchema } from "@/lib/questionnaire/schema";

type AssignedQ = { modules: string[]; schema: QuestionnaireSchema };
type PrefillQ = { sex: string | null; education: number | null; occupation: number | null } | null;

/** In-flow person view + 4-domain entry, in a bottom-sheet (mobile) / dialog (desktop). Fetches detail
 *  via /api/portal/person-detail; re-loads on save and signals the parent to refresh folder status. */
export function PersonSheet({
  personId, onClose, onSaved, onScored,
}: { personId: string | null; onClose: () => void; onSaved: () => void; onScored?: (overall: number | null) => void }) {
  const [detail, setDetail] = useState<PersonDetail | null>(null);
  const [q, setQ] = useState<{ assigned: AssignedQ; prefill: PrefillQ } | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [purging, setPurging] = useState(false);

  const load = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/person-detail?personId=${id}`);
      const j = await res.json();
      const d: PersonDetail | null = j.person ?? null;
      setDetail(d);
      if (d) {
        const qr = await fetch(`/api/portal/person-questionnaire?projectId=${d.projectId}&personId=${id}`);
        const qj = (await qr.json().catch(() => ({}))) as { assigned?: AssignedQ | null; prefill?: PrefillQ };
        setQ(qj?.assigned ? { assigned: qj.assigned, prefill: qj.prefill ?? null } : null);
      } else setQ(null);
    } catch {
      setDetail(null); setQ(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setConfirming(false);
    if (!personId) { setDetail(null); setQ(null); return; }
    let cancelled = false;
    (async () => { if (!cancelled) await load(personId); })();
    return () => { cancelled = true; };
  }, [personId]);

  async function purge() {
    if (!detail) return;
    setPurging(true);
    try {
      const res = await fetch("/api/portal/purge-person", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: detail.personId, projectId: detail.projectId }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (res.ok && j.ok) { onSaved(); onClose(); }
    } finally {
      setPurging(false); setConfirming(false);
    }
  }

  const baseline = detail?.assessments.find((a) => a.isBaseline);
  const latest = detail?.assessments.find((a) => a.isLatest);
  const delta = aaiDelta(baseline?.overall, latest?.overall);

  // Per-dimension takeaway (same as the read-only dashboard sheet): strongest (จุดเด่น) + lowest (ควรพัฒนา) มิติ.
  const { strongest, weakest } = strongestWeakest(latest);

  return (
    <Sheet open={!!personId} onClose={onClose} title={detail ? (detail.fullName || detail.personCode) : "ผู้สูงอายุ"}>
      {loading && <p className="py-6 text-center text-sm text-ink-muted">กำลังโหลด…</p>}
      {detail && (
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            รหัส {detail.personCode}
            {detail.tambonTh ? ` · ต.${detail.tambonTh}` : ""}
            {detail.ageBand ? ` · ${detail.ageBand} ปี` : ""}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <SummaryBox label="เริ่มต้น" value={baseline?.overall ?? null} />
            <SummaryBox label="ล่าสุด" value={latest?.overall ?? null} highlight />
            <div className="card flex flex-col justify-center gap-0.5 p-2.5 text-center">
              <div className="text-xs text-ink-muted">เปลี่ยน</div>
              <div className={`font-display text-lg font-bold ${delta == null ? "text-ink-muted" : delta >= 0 ? "text-success-fg" : "text-danger-fg"}`}>
                {delta == null ? "—" : delta >= 0 ? `+${delta}` : delta}
              </div>
            </div>
          </div>

          <DimensionHighlightCards strongest={strongest} weakest={weakest} />

          {q?.assigned ? (
            <>
              <div className="space-y-3 rounded-card border border-accent/30 bg-accent-soft/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <IconClipboardList size={18} className="text-accent" /> แบบสอบถาม (คำนวณคะแนน + AAI อัตโนมัติ)
                  </span>
                  <a href={`/integrate/${detail.projectId}/${detail.personId}/questionnaire`} className="shrink-0 text-xs text-accent underline">
                    เปิดเต็มหน้า / ประวัติ
                  </a>
                </div>
                <QuestionnaireEntry projectId={detail.projectId} personId={detail.personId} personCode={detail.personCode}
                  schema={q.assigned.schema} modules={q.assigned.modules} canEdit
                  prefill={q.prefill ? { sex: q.prefill.sex, education: q.prefill.education, occupation: q.prefill.occupation } : undefined}
                  onSaved={(overall) => { onScored?.(overall); onSaved(); void load(detail.personId); }} />
              </div>

              <details className="rounded-card border border-border bg-surface-soft/40 p-2 text-sm text-ink-soft">
                <summary className="cursor-pointer">กรอกคะแนน AAI เอง (สำรอง)</summary>
                <div className="pt-2">
                  <PersonDomainForm personId={detail.personId} projectId={detail.projectId} assessments={detail.assessments}
                    onSaved={() => onSaved()}
                    onDone={(overall) => { onScored?.(overall); onClose(); }} />
                </div>
              </details>
            </>
          ) : (
            <PersonDomainForm personId={detail.personId} projectId={detail.projectId} assessments={detail.assessments}
              onSaved={() => onSaved()}
              onDone={(overall) => { onScored?.(overall); onClose(); }} />
          )}

          {/* Hard purge — permanent, cascades to all AAI + encrypted name */}
          <div className="border-t border-border pt-3">
            {!confirming ? (
              <button type="button" onClick={() => setConfirming(true)}
                className="text-xs font-medium text-danger-fg hover:underline">ลบผู้เข้าร่วมถาวร</button>
            ) : (
              <div className="space-y-2 rounded-card border border-danger-bg bg-danger-bg/40 p-3">
                <p className="text-xs text-danger-fg">
                  ยืนยันลบ <span className="font-semibold">{detail.personCode}</span> ถาวร — ข้อมูล AAI ทั้งหมดจะถูกลบและกู้คืนไม่ได้
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={purge} disabled={purging}
                    className="rounded-card bg-danger px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                    {purging ? "กำลังลบ…" : "ลบถาวร"}
                  </button>
                  <button type="button" onClick={() => setConfirming(false)}
                    className="rounded-card border border-border px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-soft">ยกเลิก</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
