/** A labelled progress bar (form fields, or location submission). Pure presentational. */
export function ProgressBar({
  filled,
  total,
  label = "กรอกแล้ว",
  unit = "ช่อง",
}: {
  filled: number;
  total: number;
  label?: string;
  unit?: string;
}) {
  const pct = total === 0 ? 100 : Math.round((filled / total) * 100);
  const complete = total > 0 && filled >= total;

  return (
    <div className="card p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink-soft whitespace-nowrap">
          {label}{" "}
          <span className="font-display font-semibold text-ink">
            {filled}/{total}
          </span>{" "}
          {unit}
        </span>
        <span
          className={`text-sm font-semibold whitespace-nowrap ${
            complete ? "text-success-fg" : "text-ink-accent"
          }`}
        >
          {pct}%
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-soft">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            complete ? "bg-success" : "bg-accent"
          }`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={filled}
          aria-valuemin={0}
          aria-valuemax={total}
        />
      </div>
    </div>
  );
}
