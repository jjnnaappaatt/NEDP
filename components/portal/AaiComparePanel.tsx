"use client";

import { Card } from "@/components/ui/Card";
import { IconX, IconEyeOff } from "@tabler/icons-react";
import { DOMAINS } from "./aaiDomains";
import { aaiDelta } from "@/lib/aai/insights";
import type { AaiSnapshotRow } from "@/lib/data";

type Triple = { base: number | null; prev: number | null; latest: number | null };
const METRICS: { key: "overall" | "d1" | "d2" | "d3" | "d4"; label: string }[] = [
  { key: "overall", label: "AAI รวม" },
  ...DOMAINS,
];

function Cell({ t }: { t: Triple }) {
  if (t.latest == null) return <span className="text-ink-muted">—</span>;
  const delta = aaiDelta(t.base, t.latest);
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-display text-base font-bold text-ink">{t.latest}</span>
      {delta != null && (
        <span className={delta >= 0 ? "text-xs font-semibold text-success-fg" : "text-xs font-semibold text-danger-fg"}>
          {delta >= 0 ? `+${delta}` : delta}
        </span>
      )}
    </span>
  );
}

/** Side-by-side comparison of up to 5 selected areas: AAI รวม + the 4 domains, latest value with the
 *  change from เริ่มต้น. Sticky first column; horizontal scroll on narrow screens. */
export function AaiComparePanel({
  rows, nameOf, onRemove, onClear,
}: {
  rows: AaiSnapshotRow[];
  nameOf: (r: AaiSnapshotRow) => string;
  onRemove: (geoCode: string) => void;
  onClear: () => void;
}) {
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="border-l-4 border-accent pl-2 font-display text-base font-semibold text-ink">
          เปรียบเทียบพื้นที่ ({rows.length})
        </h2>
        <button onClick={onClear} className="text-xs font-medium text-ink-muted hover:text-ink">ล้างทั้งหมด</button>
      </div>
      <p className="-mt-1 text-xs text-ink-muted">ตัวเลข = คะแนนล่าสุด · ตัวเล็ก = เปลี่ยนแปลงจากครั้งแรก · เลือกได้สูงสุด 5 พื้นที่</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface p-2 text-left text-xs font-medium text-ink-soft">มิติ</th>
              {rows.map((r) => (
                <th key={r.geoCode} className="min-w-[110px] p-2 text-left align-top">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">{nameOf(r)}</div>
                      <div className="text-xs font-normal text-ink-muted">{r.nElderly.toLocaleString("th-TH")} คน</div>
                    </div>
                    <button onClick={() => onRemove(r.geoCode)} className="shrink-0 rounded p-0.5 text-ink-muted hover:bg-surface-soft hover:text-ink" aria-label="เอาออก">
                      <IconX size={14} />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m) => (
              <tr key={m.key} className="border-t border-border">
                <td className="sticky left-0 z-10 bg-surface p-2 text-xs font-medium text-ink-soft">{m.label}</td>
                {rows.map((r) => (
                  <td key={r.geoCode} className="p-2">
                    {r.suppressed ? <IconEyeOff size={14} className="text-ink-muted" /> : <Cell t={r[m.key]} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
