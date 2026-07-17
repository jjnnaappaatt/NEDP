"use client";

import { useEffect, useState } from "react";
import { IconSearch, IconAlertTriangle, IconChevronRight } from "@tabler/icons-react";
import { fieldCls } from "./fieldStyles";
import { PersonAaiSheet } from "./PersonAaiSheet";
import { DEMO_PERSONS, demoDetailFor } from "./demoPersons";
import type { PersonRow, TambonPersonDetail } from "@/lib/data";

/** Individual AAI list for one tambon (dashboard drill leaf). Search by รหัสผู้เข้าร่วม (HN / person_code) —
 *  NO name. Tap a person → read-only AAI detail. Demo mode uses static sample people (real data is empty). */
export function TambonIndividuals({ tambonCode, tambonName, projectIds, demo }: {
  tambonCode: string; tambonName?: string; projectIds: string[]; demo: boolean;
}) {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(!demo);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openDemo, setOpenDemo] = useState<TambonPersonDetail | null>(null);

  useEffect(() => {
    if (demo) { setLoading(false); return; }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ tambonCode, projects: projectIds.join(","), q: query });
        const res = await fetch(`/api/portal/tambon-persons?${params.toString()}`);
        const j = await res.json();
        if (!cancelled) setPeople(j.people ?? []);
      } catch {
        /* keep previous */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 280);
    return () => { cancelled = true; clearTimeout(handle); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, tambonCode, projectIds.join(","), query]);

  const q = query.trim().toLowerCase();
  const rows = demo ? DEMO_PERSONS.filter((p) => !q || p.personCode.toLowerCase().includes(q)) : people;

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-semibold text-ink">รายบุคคล{tambonName ? ` · ต.${tambonName}` : ""}</h2>
      <div className="relative">
        <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} className={`${fieldCls} pl-9`}
          placeholder="ค้นหาด้วยรหัสผู้เข้าร่วม (HN)…" />
      </div>
      {!demo && loading && <p className="text-center text-xs text-ink-muted">กำลังโหลด…</p>}
      {!rows.length && !(loading && !demo) ? (
        <div className="card p-6 text-center text-sm text-ink-soft">
          {query ? "ไม่พบรหัสที่ตรงกับคำค้นหา" : "ยังไม่มีผู้เข้าร่วมในตำบลนี้"}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rows.map((p) => (
            <button key={p.personId}
              onClick={() => { if (demo) setOpenDemo(demoDetailFor(p.personCode)); else setOpenId(p.personId); }}
              className="card flex items-center justify-between gap-3 p-3 text-left transition hover:border-border-accent hover:bg-accent-soft/40">
              <div className="min-w-0">
                <div className="truncate font-medium text-ink">{p.personCode}</div>
                <div className="truncate text-xs text-ink-muted">
                  {p.latestOverall != null ? `AAI ล่าสุด ${p.latestOverall}` : "ยังไม่มีคะแนน"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {p.hasClinicalFlag && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-danger-bg px-2 py-0.5 text-xs font-medium text-danger-fg">
                    <IconAlertTriangle size={13} /> ส่งต่อ
                  </span>
                )}
                <IconChevronRight size={18} className="text-ink-muted" />
              </div>
            </button>
          ))}
        </div>
      )}
      <PersonAaiSheet personId={openId} demoDetail={openDemo} onClose={() => { setOpenId(null); setOpenDemo(null); }} />
    </div>
  );
}
