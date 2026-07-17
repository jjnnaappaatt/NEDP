import { PageSkeleton } from "aai-next-dashboard";

/** The instant route-skeleton: a header stub, four KPI tiles, and pulsing list rows. */
export function Loading() {
  return (
    <div style={{ maxWidth: 540 }}>
      <PageSkeleton rows={3} />
    </div>
  );
}
