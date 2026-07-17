"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconSearch, IconAlertTriangle, IconChevronRight, IconPencil } from "@tabler/icons-react";
import { fieldCls } from "./fieldStyles";
import { CURRENT_MONTH } from "@/lib/format";
import type { PersonRow } from "@/lib/data";

/** Browse + name-search the people enrolled in this tambon (self-loading). Each row opens the person's
 *  view + 4-domain entry sheet via onOpenPerson; people who still need this month's score get a prominent
 *  "กรอกข้อมูล AAI" call-to-action so field workers can see remaining work at a glance. Every name lookup
 *  is audit-logged server-side. */
export function PersonSearchPanel({
  projectId, tambonCode, onOpenPerson, reloadKey = 0,
}: { projectId: string; tambonCode: string; onOpenPerson: (personId: string) => void; reloadKey?: number }) {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [unscoredOnly, setUnscoredOnly] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    // mount + reloadKey changes → fetch immediately; query changes → debounce
    const debounce = firstRender.current ? 0 : 280;
    firstRender.current = false;
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ projectId, tambonCode, query });
        const res = await fetch(`/api/portal/search-persons?${params.toString()}`);
        const j = await res.json();
        if (!cancelled) setPeople(j.people ?? []);
      } catch {
        /* keep previous results */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, debounce);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [query, projectId, tambonCode, reloadKey]);

  const searching = query.trim() !== "";
  // "done this month" = the person's latest assessment is the current month.
  const total = people.length;
  const scored = useMemo(() => people.filter((p) => p.latestMonth === CURRENT_MONTH).length, [people]);

  // Unscored-first, then by code — so the remaining work floats to the top. (Presentational only.)
  const rows = useMemo(() => {
    const marked = people.map((p) => ({ p, needs: p.latestMonth !== CURRENT_MONTH }));
    const list = unscoredOnly ? marked.filter((m) => m.needs) : marked;
    return [...list].sort((a, b) =>
      a.needs !== b.needs ? (a.needs ? -1 : 1) : a.p.personCode.localeCompare(b.p.personCode),
    );
  }, [people, unscoredOnly]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} className={`${fieldCls} pl-9`}
          placeholder="ค้นหาด้วยชื่อ–สกุล…" />
      </div>

      {/* Per-tambon progress for this month + an unscored-only filter (hidden while name-searching). */}
      {!searching && total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-ink-soft">
              ให้คะแนนเดือนนี้แล้ว <span className="font-semibold text-ink">{scored}</span> / {total} คน
            </span>
            <button type="button" onClick={() => setUnscoredOnly((v) => !v)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                unscoredOnly ? "border-accent bg-accent-soft text-ink" : "border-border text-ink-soft hover:bg-surface-soft"
              }`}>
              ยังไม่ให้คะแนนเดือนนี้
            </button>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-soft">
            <div className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${total ? Math.round((scored / total) * 100) : 0}%` }} />
          </div>
        </div>
      )}

      {loading && <p className="text-center text-xs text-ink-muted">กำลังโหลด…</p>}
      {!loading && !rows.length ? (
        <div className="card p-6 text-center text-sm text-ink-soft">
          {searching
            ? "ไม่พบผู้สูงอายุที่ตรงกับคำค้นหา"
            : unscoredOnly
              ? "ให้คะแนนครบทุกคนแล้วในเดือนนี้ 🎉"
              : "ยังไม่มีผู้สูงอายุในตำบลนี้ — กดแท็บ “เพิ่มผู้สูงอายุ”"}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rows.map(({ p, needs }) => {
            const neverScored = p.latestOverall == null;
            const status = neverScored
              ? "ยังไม่มีคะแนน"
              : needs
                ? `ล่าสุด ${p.latestOverall} · ยังไม่ได้บันทึกเดือนนี้`
                : `AAI เดือนนี้ ${p.latestOverall}`;
            return (
              <button key={p.personId} onClick={() => onOpenPerson(p.personId)}
                className="card flex items-center justify-between gap-3 p-3 text-left transition hover:border-border-accent hover:bg-accent-soft/40">
                <div className="min-w-0">
                  <div className="truncate font-medium text-ink">{p.fullName || p.personCode}</div>
                  <div className="truncate text-xs text-ink-muted">
                    {p.fullName ? `${p.personCode} · ` : ""}{status}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {p.hasClinicalFlag && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-danger-bg px-2 py-0.5 text-xs font-medium text-danger-fg">
                      <IconAlertTriangle size={13} /> ส่งต่อ
                    </span>
                  )}
                  {needs ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-medium text-[var(--on-accent)]">
                      <IconPencil size={13} /> {neverScored ? "กรอกข้อมูล AAI" : "กรอกเดือนนี้"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                      อัปเดต <IconChevronRight size={16} />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
