import { fieldCls } from "./fieldStyles";

/** One labeled 0–100 AAI domain score input. Presentational — the parent owns the value, the live
 *  Overall calc, validation, and submit; this just renders the field. */
export function DomainScoreInput({
  label, value, onChange, disabled, hint = "(0–100)",
}: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean; hint?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">
        {label} <span className="text-xs font-normal text-ink-muted">{hint}</span>
      </label>
      <input type="number" inputMode="decimal" step="0.01" min={0} max={100}
        value={value} onChange={(e) => onChange(e.target.value)} className={fieldCls}
        disabled={disabled} placeholder="คะแนน 0–100" />
    </div>
  );
}
