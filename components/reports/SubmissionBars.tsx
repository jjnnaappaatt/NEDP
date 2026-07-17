/** Pure-CSS vertical bar chart — per-month submission counts. No chart lib. */
export interface MonthBar {
  /** short Thai month label, e.g. "มิ.ย." */
  label: string;
  /** Thai Buddhist year short, e.g. "69" */
  year: string;
  count: number;
  /** true for the current month — gets the hero accent */
  current?: boolean;
}

export function SubmissionBars({ bars }: { bars: MonthBar[] }) {
  const max = Math.max(1, ...bars.map((b) => b.count));
  return (
    <div className="flex items-end justify-between gap-2 sm:gap-3" role="img" aria-label="จำนวนการส่งข้อมูลรายเดือน">
      {bars.map((b, i) => {
        const pct = Math.round((b.count / max) * 100);
        return (
          <div key={`${b.label}-${b.year}-${i}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="font-display text-sm font-bold leading-none text-ink">{b.count}</div>
            <div className="flex h-28 w-full items-end justify-center">
              <div
                className={
                  "w-full max-w-[44px] rounded-t-card transition-all " +
                  (b.current ? "bg-hero" : "bg-accent/35")
                }
                style={{ height: `${Math.max(8, pct)}%` }}
              />
            </div>
            <div className="text-center leading-tight">
              <div className="text-xs font-medium text-ink-soft whitespace-nowrap">{b.label}</div>
              <div className="text-xs text-ink-muted">{b.year}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
