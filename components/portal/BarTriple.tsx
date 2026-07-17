import { aaiDelta } from "@/lib/aai/insights";

/** Three-time-point horizontal bars: เริ่มต้น (baseline) → เดือนที่แล้ว → ล่าสุด. CSS-only (no chart lib),
 *  matching the app's existing bar/podium convention. Values are 0–`max` (default 100). */
export function BarTriple({
  label, base, prev, latest, max = 100,
}: { label: string; base: number | null; prev: number | null; latest: number | null; max?: number }) {
  // Three visibly distinct tiers so เริ่มต้น and เดือนที่แล้ว read as real bars, not empty tracks: a light→
  // full mint ramp. NB: Tailwind /opacity modifiers (bg-accent/60) emit invalid CSS here because the color
  // tokens are hex-valued CSS vars — so we mix opaque fills with color-mix (theme-aware, light + dark).
  const bars = [
    { k: "เริ่มต้น", v: base, fill: "color-mix(in srgb, var(--accent) 38%, var(--surface-1))" },
    { k: "เดือนที่แล้ว", v: prev, fill: "color-mix(in srgb, var(--accent) 68%, var(--surface-1))" },
    { k: "ล่าสุด", v: latest, fill: "var(--accent)" },
  ];
  const delta = aaiDelta(base, latest);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink">{label}</span>
        {delta != null && (
          <span className={`text-xs font-semibold ${delta >= 0 ? "text-success-fg" : "text-danger-fg"}`}>
            {delta >= 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {bars.map((b) => (
          <div key={b.k} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs text-ink-muted">{b.k}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-soft">
              <div className="h-full rounded-full"
                style={{ width: `${b.v != null ? Math.max(0, Math.min(100, (b.v / max) * 100)) : 0}%`, backgroundColor: b.fill }} />
            </div>
            <span className="w-10 shrink-0 text-right text-xs font-medium text-ink">{b.v ?? "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
