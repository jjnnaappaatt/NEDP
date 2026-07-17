import type { DimHighlight } from "@/lib/aai/insights";

/** Two-card per-dimension takeaway: green จุดเด่น (strongest มิติ) + amber ควรพัฒนา (weakest มิติ). Renders
 *  nothing unless both exist and their labels differ, matching the previous inlined guard. */
export function DimensionHighlightCards({ strongest, weakest }: {
  strongest: DimHighlight | null; weakest: DimHighlight | null;
}) {
  if (!strongest || !weakest || strongest.label === weakest.label) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-card border border-success-bg bg-success-bg/50 p-2.5">
        <div className="text-xs font-semibold text-success-fg">จุดเด่น</div>
        <div className="mt-0.5 text-xs font-medium text-ink [overflow-wrap:anywhere]">{strongest.label}</div>
        <div className="font-display text-base font-bold text-ink">{strongest.v}</div>
      </div>
      <div className="rounded-card border border-warning-bg bg-warning-bg/50 p-2.5">
        <div className="text-xs font-semibold text-warning-fg">ควรพัฒนา</div>
        <div className="mt-0.5 text-xs font-medium text-ink [overflow-wrap:anywhere]">{weakest.label}</div>
        <div className="font-display text-base font-bold text-ink">{weakest.v}</div>
      </div>
    </div>
  );
}
