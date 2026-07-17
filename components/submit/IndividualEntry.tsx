"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconChevronRight, IconSearch, IconCircleCheck } from "@tabler/icons-react";
import { AreaFolderGrid } from "./AreaFolderGrid";
import { TambonHubTabs } from "@/components/portal/TambonHubTabs";
import { PersonSheet } from "@/components/portal/PersonSheet";
import { fieldCls } from "@/components/portal/fieldStyles";
import type { ProjectAreaTree } from "@/lib/data";

/**
 * ส่งข้อมูล → รายบุคคล: a project-scoped จังหวัด→อำเภอ→ตำบล folder drill-down (status colours roll up),
 * a per-จังหวัด ตำบล search shortcut, and the ตำบล hub (enroll / search / อสม.) with in-flow person entry.
 * Drilling is client-side over the server-passed tree; writes call router.refresh() to recompute status.
 */
export function IndividualEntry({
  projectId, areaTree, canEdit,
}: { projectId: string; areaTree: ProjectAreaTree; canEdit: boolean }) {
  const router = useRouter();
  const [provCode, setProvCode] = useState<string | null>(null);
  const [amphCode, setAmphCode] = useState<string | null>(null);
  const [tamCode, setTamCode] = useState<string | null>(null);
  const [openPersonId, setOpenPersonId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const bump = () => { setVersion((v) => v + 1); router.refresh(); };

  // Auto-dismiss the save confirmation; also clear it when a person sheet re-opens (avoid a stale toast).
  useEffect(() => {
    if (!toast) return;
    const h = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(h);
  }, [toast]);
  useEffect(() => { if (openPersonId) setToast(null); }, [openPersonId]);

  // derive selected nodes from the (refreshable) tree by code, so status stays current after router.refresh()
  const prov = useMemo(() => areaTree.provinces.find((p) => p.code === provCode) ?? null, [areaTree, provCode]);
  const amph = useMemo(() => prov?.children?.find((a) => a.code === amphCode) ?? null, [prov, amphCode]);
  const tam = useMemo(() => amph?.children?.find((t) => t.code === tamCode) ?? null, [amph, tamCode]);

  const provTambons = useMemo(
    () => (prov?.children ?? []).flatMap((a) => (a.children ?? []).map((t) => ({ amph: a, tam: t }))),
    [prov],
  );
  const matches = useMemo(() => {
    const s = q.trim();
    return s ? provTambons.filter((x) => x.tam.nameTh.includes(s)) : [];
  }, [q, provTambons]);

  if (!canEdit) {
    return <div className="card p-8 text-center text-ink-soft">คุณไม่ได้เป็นผู้รับผิดชอบโครงการนี้ จึงบันทึกข้อมูลรายบุคคลไม่ได้</div>;
  }
  if (!areaTree.provinces.length) {
    return (
      <div className="card p-8 text-center text-sm text-ink-soft">
        ยังไม่มีพื้นที่ของโครงการที่จับคู่รหัสตำบล (TIS-1099)
        {areaTree.unmappedLocations > 0 && <> — มี {areaTree.unmappedLocations} พื้นที่ที่ยังไม่ได้จับคู่</>}
      </div>
    );
  }

  const reset = () => { setProvCode(null); setAmphCode(null); setTamCode(null); setQ(""); };
  const crumbBtn = "hover:text-accent hover:underline";

  return (
    <div className="space-y-4">
      {/* breadcrumb (client-state, not routes) */}
      <nav className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
        <button onClick={reset} className={provCode ? crumbBtn : "font-medium text-ink"}>จังหวัด</button>
        {prov && (
          <><IconChevronRight size={14} />
            <button onClick={() => { setAmphCode(null); setTamCode(null); }} className={amphCode || tamCode ? crumbBtn : "font-medium text-ink"}>จ.{prov.nameTh}</button></>
        )}
        {amph && (
          <><IconChevronRight size={14} />
            <button onClick={() => setTamCode(null)} className={tamCode ? crumbBtn : "font-medium text-ink"}>อ.{amph.nameTh}</button></>
        )}
        {tam && <><IconChevronRight size={14} /><span className="font-medium text-ink">ต.{tam.nameTh}</span></>}
      </nav>

      {/* level views */}
      {tam ? (
        <TambonHubTabs projectId={projectId} tambonCode={tam.code} onOpenPerson={setOpenPersonId} onChange={bump} refreshKey={version} />
      ) : amph ? (
        <AreaFolderGrid nodes={amph.children ?? []} onSelect={(t) => setTamCode(t.code)} emptyLabel="ไม่มีตำบล" />
      ) : prov ? (
        <div className="space-y-3">
          <div className="relative">
            <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} className={`${fieldCls} pl-9`}
              placeholder={`ค้นหาตำบลใน ${prov.nameTh}…`} />
          </div>
          {q.trim() ? (
            !matches.length ? (
              <div className="card p-6 text-center text-sm text-ink-soft">ไม่พบตำบลที่ตรงกับ “{q}”</div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {matches.map(({ amph: a, tam: t }) => (
                  <button key={t.code} onClick={() => { setAmphCode(a.code); setTamCode(t.code); setQ(""); }}
                    className="card flex items-center justify-between gap-2 p-3 text-left transition hover:border-border-accent hover:bg-accent-soft/30">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink">ต.{t.nameTh}</div>
                      <div className="truncate text-xs text-ink-muted">อ.{a.nameTh}</div>
                    </div>
                    <IconChevronRight size={18} className="shrink-0 text-ink-muted" />
                  </button>
                ))}
              </div>
            )
          ) : (
            <AreaFolderGrid nodes={prov.children ?? []} onSelect={(a) => setAmphCode(a.code)} emptyLabel="ไม่มีอำเภอ" />
          )}
        </div>
      ) : (
        <>
          <AreaFolderGrid nodes={areaTree.provinces} onSelect={(p) => setProvCode(p.code)} emptyLabel="ไม่มีจังหวัด" />
          {areaTree.unmappedLocations > 0 && (
            <p className="text-xs text-ink-muted">มี {areaTree.unmappedLocations} พื้นที่ที่ยังไม่ได้จับคู่รหัสตำบล (จะปรากฏเมื่อจับคู่แล้ว)</p>
          )}
        </>
      )}

      <PersonSheet personId={openPersonId} onClose={() => setOpenPersonId(null)} onSaved={bump}
        onScored={(overall) => setToast(`บันทึกคะแนน AAI แล้ว — คะแนนรวม ${overall ?? "—"}`)} />

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4" role="status" aria-live="polite">
          <div className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-surface shadow-card">
            <IconCircleCheck size={18} className="text-accent" />
            <span>{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}
