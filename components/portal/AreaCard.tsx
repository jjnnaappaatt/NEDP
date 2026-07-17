"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { BarTriple } from "./BarTriple";
import { DOMAINS } from "./aaiDomains";
import { cn } from "@/lib/utils";
import { IconCheck, IconEyeOff, IconTrendingUp, IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import type { AaiSnapshotRow } from "@/lib/data";

/** One per-geo card: AAI รวม bars + a worded "ดีขึ้น ≥10%" sentence, an inline toggle that reveals the 4
 *  domain (มิติ 1–4) bars, an optional drill button (ดูรายอำเภอ/รายตำบล), and — in compare mode — a select
 *  checkbox. Holds its own expand state so cards open independently. */
export function AreaCard({
  r, name, sub, drillLabel, onDrill, compareMode, picked, onTogglePick, pickDisabled,
}: {
  r: AaiSnapshotRow; name: string; sub: string | null;
  drillLabel: string | null; onDrill: (() => void) | null;
  compareMode: boolean; picked: boolean; onTogglePick: () => void; pickDisabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pct = r.nElderly > 0 ? Math.round((r.nUp10 / r.nElderly) * 100) : 0;
  return (
    <Card className={cn("space-y-2.5", picked && "ring-2 ring-accent")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          {compareMode && (
            <button onClick={onTogglePick} disabled={pickDisabled && !picked} aria-label="เลือกเปรียบเทียบ"
              className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                picked ? "border-accent bg-accent text-[var(--on-primary)]"
                  : pickDisabled ? "border-border opacity-40" : "border-border hover:border-accent")}>
              {picked && <IconCheck size={13} />}
            </button>
          )}
          <div className="min-w-0">
            <div className="truncate font-medium text-ink">{name}</div>
            {sub && <div className="truncate text-xs text-ink-muted">{sub}</div>}
          </div>
        </div>
        <div className="shrink-0 text-sm font-semibold text-ink">{r.nElderly.toLocaleString("th-TH")} คน</div>
      </div>

      {r.suppressed ? (
        <div className="flex items-center gap-1.5 rounded-card bg-surface-soft px-2.5 py-2 text-xs text-ink-muted">
          <IconEyeOff size={14} /> ปกปิดคะแนน (ผู้สูงอายุน้อยกว่า 5 คน)
        </div>
      ) : (
        <>
          {r.nUp10 > 0 && (
            <div className="flex items-start gap-1.5 rounded-card bg-success-bg px-2.5 py-1.5 text-xs text-success-fg">
              <IconTrendingUp size={14} className="mt-0.5 shrink-0" />
              <span>
                ผู้สูงอายุ <span className="font-semibold">{r.nUp10.toLocaleString("th-TH")}</span> จาก{" "}
                {r.nElderly.toLocaleString("th-TH")} คน ({pct}%) มี AAI ดีขึ้น ≥10% จากครั้งแรก
              </span>
            </div>
          )}
          <BarTriple label="AAI รวม" base={r.overall.base} prev={r.overall.prev} latest={r.overall.latest} />
          <div className="flex gap-2">
            <button onClick={() => setOpen((o) => !o)}
              className="flex min-h-[40px] flex-1 items-center justify-center gap-1 rounded-card border border-border text-xs font-medium text-ink-soft transition hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              {open ? "ซ่อนรายมิติ" : "ดูรายมิติ 4 ด้าน"}
              <IconChevronDown size={14} className={cn("transition", open && "rotate-180")} />
            </button>
            {drillLabel && onDrill && (
              <button onClick={onDrill}
                className="flex min-h-[40px] flex-1 items-center justify-center gap-1 rounded-card border border-accent bg-accent-soft text-xs font-medium text-ink transition hover:bg-accent-soft/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                {drillLabel} <IconChevronRight size={14} />
              </button>
            )}
          </div>
          {open && (
            <div className="space-y-3 border-t border-border pt-3">
              {DOMAINS.map((d) => (
                <BarTriple key={d.key} label={d.label} base={r[d.key].base} prev={r[d.key].prev} latest={r[d.key].latest} />
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
