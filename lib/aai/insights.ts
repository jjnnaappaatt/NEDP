import { DOMAINS } from "@/components/portal/aaiDomains";
import type { PersonAssessmentPoint } from "@/lib/data";

/** Rounded change (latest − base, 1 decimal) — the single delta formula shared by the person sheets,
 *  BarTriple, and the compare panel. Returns null unless both endpoints are finite numbers. */
export function aaiDelta(base: number | null | undefined, latest: number | null | undefined): number | null {
  return typeof base === "number" && Number.isFinite(base) && typeof latest === "number" && Number.isFinite(latest)
    ? Math.round((latest - base) * 10) / 10
    : null;
}

/** One มิติ highlight: its label and the latest score. */
export type DimHighlight = { label: string; v: number };

/** Strongest (จุดเด่น) + weakest (ควรพัฒนา) มิติ by the latest per-domain score. Each is null when there
 *  are no scored dimensions; the caller shows the pair only when both exist and their labels differ. */
export function strongestWeakest(latest: PersonAssessmentPoint | null | undefined): {
  strongest: DimHighlight | null; weakest: DimHighlight | null;
} {
  const dimVals = (latest ? DOMAINS.map((d) => ({ label: d.label, v: latest[d.key] })) : [])
    .filter((x): x is DimHighlight => x.v != null);
  const strongest = dimVals.length ? dimVals.reduce((a, b) => (b.v > a.v ? b : a)) : null;
  const weakest = dimVals.length ? dimVals.reduce((a, b) => (b.v < a.v ? b : a)) : null;
  return { strongest, weakest };
}
