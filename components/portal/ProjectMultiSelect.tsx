"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconSearch, IconChevronDown, IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { fieldCls } from "@/components/portal/fieldStyles";
import type { PickerProject } from "@/lib/data";

/**
 * Searchable multi-select for choosing which projects the dashboard aggregates. Each row shows the
 * project name + its ผู้รับผิดชอบโครงการ subtitle. Collapses to a summary chip; opens a panel with a
 * search box, เลือกทั้งหมด/ล้าง, and a checkbox list. Closes on outside-click / Escape.
 */
export function ProjectMultiSelect({
  projects, selected, onToggle, onSetAll,
}: {
  projects: PickerProject[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSetAll: (ids: string[] | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim();
    return s ? projects.filter((p) => p.name.includes(s) || (p.owner ?? "").includes(s)) : projects;
  }, [q, projects]);

  const allIds = useMemo(() => projects.map((p) => p.id), [projects]);
  const summary =
    selected.size === 0 ? "ยังไม่เลือกโครงการ"
      : selected.size === projects.length ? `ทุกโครงการ (${projects.length})`
        : selected.size === 1 ? projects.find((p) => selected.has(p.id))?.name ?? "1 โครงการ"
          : `${selected.size} โครงการ`;

  return (
    <div ref={ref} className="relative">
      <label className="mb-1 block text-xs font-medium text-ink-soft">เลือกโครงการ</label>
      <button
        type="button" onClick={() => setOpen((o) => !o)}
        className={cn("flex w-full items-center justify-between gap-2 text-left", fieldCls)}
      >
        <span className="truncate text-ink">{summary}</span>
        <IconChevronDown size={16} className={cn("shrink-0 text-ink-muted transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-card border border-border bg-surface shadow-lg">
          <div className="border-b border-border p-2">
            <div className="relative">
              <IconSearch size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหาโครงการ / ผู้รับผิดชอบ…"
                className={cn(fieldCls, "pl-8")}
              />
            </div>
            <div className="mt-2 flex items-center justify-between px-1 text-xs">
              <button type="button" onClick={() => onSetAll(allIds)} className="font-medium text-accent hover:underline">เลือกทั้งหมด</button>
              <button type="button" onClick={() => onSetAll(null)} className="text-ink-muted hover:text-ink">ล้าง</button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-ink-muted">ไม่พบโครงการ</div>
            ) : (
              filtered.map((p) => {
                const on = selected.has(p.id);
                return (
                  <button
                    key={p.id} type="button" onClick={() => onToggle(p.id)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-surface-soft"
                  >
                    <span className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      on ? "border-accent bg-accent text-[var(--on-primary)]" : "border-border",
                    )}>
                      {on && <IconCheck size={12} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink">{p.name}</span>
                      {p.owner && <span className="block truncate text-xs text-ink-muted">ผู้รับผิดชอบ: {p.owner}</span>}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
