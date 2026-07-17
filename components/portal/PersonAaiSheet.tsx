"use client";

import { useEffect, useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { Sheet } from "@/components/ui/Sheet";
import { BarTriple } from "./BarTriple";
import { SummaryBox } from "./SummaryBox";
import { DimensionHighlightCards } from "./DimensionHighlightCards";
import { DOMAINS } from "./aaiDomains";
import { aaiDelta, strongestWeakest } from "@/lib/aai/insights";
import { cn } from "@/lib/utils";
import type { TambonPersonDetail } from "@/lib/data";

/** Read-only AAI detail for the dashboard รายบุคคล drill — identity by รหัส (person_code, NO name), summary +
 *  a per-dimension จุดเด่น/ควรพัฒนา takeaway + collapsible 4-มิติ bars (ดูรายมิติ, matching the area cards).
 *  `demoDetail` renders a static sample; otherwise fetches by personId. */
export function PersonAaiSheet({ personId, demoDetail, onClose }: {
  personId: string | null; demoDetail?: TambonPersonDetail | null; onClose: () => void;
}) {
  const [fetched, setFetched] = useState<TambonPersonDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDims, setShowDims] = useState(false);

  useEffect(() => {
    setShowDims(false); // collapse the per-มิติ detail whenever a different person opens
    if (demoDetail || !personId) { setFetched(null); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/portal/tambon-person-detail?personId=${personId}`);
        const j = await res.json();
        if (!cancelled) setFetched(j.person ?? null);
      } catch { if (!cancelled) setFetched(null); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [personId, demoDetail]);

  const detail = demoDetail ?? fetched;
  const open = !!(personId || demoDetail);
  const baseline = detail?.assessments.find((a) => a.isBaseline);
  const latest = detail?.assessments.find((a) => a.isLatest);
  const delta = aaiDelta(baseline?.overall, latest?.overall);

  // Per-dimension takeaway: strongest (จุดเด่น) + lowest (ควรพัฒนา) มิติ by the latest score.
  const { strongest, weakest } = strongestWeakest(latest);

  return (
    <Sheet open={open} onClose={onClose} title={detail ? detail.personCode : "ผู้เข้าร่วม"}>
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

          {latest ? (
            <div className="border-t border-border pt-3">
              <BarTriple label="AAI รวม" base={baseline?.overall ?? null} prev={null} latest={latest.overall} />
              <button type="button" onClick={() => setShowDims((o) => !o)}
                className="mt-2.5 flex min-h-[40px] w-full items-center justify-center gap-1 rounded-card border border-border text-xs font-medium text-ink-soft transition hover:bg-surface-soft">
                {showDims ? "ซ่อนรายมิติ" : "ดูรายมิติ 4 ด้าน"}
                <IconChevronDown size={14} className={cn("transition", showDims && "rotate-180")} />
              </button>
              {showDims && (
                <div className="mt-3 space-y-3 border-t border-border pt-3">
                  {DOMAINS.map((d) => (
                    <BarTriple key={d.key} label={d.label} base={baseline?.[d.key] ?? null} prev={null} latest={latest[d.key]} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="border-t border-border pt-4 text-center text-sm text-ink-muted">ยังไม่มีคะแนน AAI</p>
          )}
        </div>
      )}
    </Sheet>
  );
}
