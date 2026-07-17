import { StatusBadge } from "aai-next-dashboard";

/** Submission lifecycle, each status mapped to its tone + Thai label automatically. */
export function AllStatuses() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <StatusBadge status="submitted" />
      <StatusBadge status="approved" />
      <StatusBadge status="draft" />
      <StatusBadge status="not_started" />
      <StatusBadge status="rejected" />
    </div>
  );
}
