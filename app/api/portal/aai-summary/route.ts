import { NextResponse } from "next/server";
import { getAaiSnapshotSummary, type AaiLevel } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Aggregate AAI snapshot rows for the interactive dashboard. De-identified + <5 suppressed, so no
 *  per-user gating (same posture as the public /exec dashboard). Because this endpoint is public, we
 *  also blank the small-cell COUNTS on suppressed rows: a suppressed tambon with n_elderly=1, n_up10=1
 *  would otherwise disclose that the single elder there did (or didn't) improve ≥10% — the exact
 *  re-identification the score suppression is meant to prevent. See AUDIT.md → MED-1. Authenticated
 *  admin drill-downs read getAaiSnapshotSummary directly and keep the counts. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const lv = url.searchParams.get("level");
  const level: AaiLevel = lv === "amphoe" || lv === "tambon" ? lv : "province";
  const projects = url.searchParams.get("projects");
  const projectIds = projects ? projects.split(",").filter(Boolean) : undefined;
  const parent = url.searchParams.get("parent") || undefined;
  const rows = await getAaiSnapshotSummary({ level, projectIds, parent });
  const publicRows = rows.map((r) =>
    r.suppressed ? { ...r, nElderly: 0, nUp10: 0, osmBefore: 0, osmAfter: 0 } : r,
  );
  return NextResponse.json({ rows: publicRows });
}
