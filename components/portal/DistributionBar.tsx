import { IconAlertTriangle } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { RISK_LABEL, riskSolid } from "./riskStyles";
import type { SurveyToolAgg } from "@/lib/data";

const BANDS = ["high", "medium", "normal"] as const;

/**
 * One clinical tool's risk-band distribution across the project's people — a stacked segmented bar
 * (สูง / ปานกลาง / ต่ำ) with counts, plus mean·N and a flag badge. CSS-only; the homogeneous, honest
 * cross-tool view (raw scores aren't comparable between tools, risk bands are).
 */
export function DistributionBar({ t }: { t: SurveyToolAgg }) {
  const total = t.risk.high + t.risk.medium + t.risk.normal;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-ink">{t.label}</span>
        <span className="flex items-center gap-2 text-xs text-ink-muted">
          {t.mean != null && <span>เฉลี่ย {t.mean}</span>}
          <span>{t.n} คน</span>
          {t.flagged > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-danger/10 px-1.5 py-0.5 font-medium text-danger-fg">
              <IconAlertTriangle size={11} /> {t.flagged}
            </span>
          )}
        </span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-soft">
        {BANDS.map((b) =>
          t.risk[b] > 0 ? (
            <div key={b} className={cn("h-full", riskSolid(b))} style={{ width: `${pct(t.risk[b])}%` }}
              title={`${RISK_LABEL[b]}: ${t.risk[b]}`} />
          ) : null,
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-ink-muted">
        {BANDS.map((b) =>
          t.risk[b] > 0 ? (
            <span key={b} className="inline-flex items-center gap-1">
              <span className={cn("h-2 w-2 rounded-full", riskSolid(b))} /> {RISK_LABEL[b]} {t.risk[b]}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}
