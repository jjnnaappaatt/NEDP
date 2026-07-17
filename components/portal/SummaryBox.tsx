/** Shared summary tile (label + big value) used across the person sheets. `min-w-0` lets a row of three
 *  shrink inside a grid-cols-3 track so the Thai labels (เริ่มต้น/ล่าสุด/เปลี่ยน) and values never clip on
 *  narrow phones (≤360px); `tabular-nums` keeps the numbers evenly spaced. Desktop appearance unchanged. */
export function SummaryBox({ label, value, highlight }: { label: string; value: number | null; highlight?: boolean }) {
  return (
    <div className={`card flex min-w-0 flex-col justify-center gap-0.5 p-2.5 text-center ${highlight ? "border-accent/40 bg-accent-soft/30" : ""}`}>
      <div className="text-xs text-ink-muted [overflow-wrap:anywhere]">{label}</div>
      <div className="font-display text-xl font-bold tabular-nums text-ink">{value ?? "—"}</div>
    </div>
  );
}
