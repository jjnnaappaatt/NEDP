import type { SurveyToolAgg } from "@/lib/data";

/**
 * One survey "specific score" aggregated across the project's people — a mean gauge. Survey scores carry
 * no risk band (uniformly normal), so a mean·N gauge (not a risk split) is the honest view. The scale is
 * the schema-declared, aggregation-aware bound (mean → max; sum → max×#questions); when unknown it shows
 * the mean with no bar rather than inventing a scale from the top scorer's value. CSS-only.
 */
export function ScoreGauge({ t }: { t: SurveyToolAgg }) {
  const scale = t.scoreScale;
  const pct = t.mean != null && scale ? Math.min(100, (t.mean / scale) * 100) : null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-ink">{t.label}</span>
        <span className="text-xs text-ink-muted">
          {t.mean != null ? <>เฉลี่ย <span className="font-semibold text-ink">{t.mean}</span>{scale ? ` / ${scale}` : ""}</> : "—"}
          {" · "}{t.n} คน
        </span>
      </div>
      {pct != null && (
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-soft">
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
