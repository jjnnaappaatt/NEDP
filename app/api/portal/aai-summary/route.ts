import { NextResponse } from "next/server";
import { getAaiSnapshotSummary, type AaiLevel } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Aggregate AAI snapshot rows for the interactive dashboard. De-identified + <5 suppressed, so no
 *  per-user gating (same posture as the public /exec dashboard). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const lv = url.searchParams.get("level");
  const level: AaiLevel = lv === "amphoe" || lv === "tambon" ? lv : "province";
  const projects = url.searchParams.get("projects");
  const projectIds = projects ? projects.split(",").filter(Boolean) : undefined;
  const parent = url.searchParams.get("parent") || undefined;
  const rows = await getAaiSnapshotSummary({ level, projectIds, parent });
  return NextResponse.json({ rows });
}
