import { NextResponse } from "next/server";
import { bulkSubmitLocations } from "@/lib/data";

export const dynamic = "force-dynamic";

/** JSON bulk-submit from the in-app grid (the "ส่งทั้งหมด" action) — the same write-path as the
 *  xlsx upload (bulkSubmitLocations → location_submissions), so it inherits the same DB trigger that
 *  projects each row to the bot's monitor_submissions/monitor_facts. Gated server-side on being a
 *  project contact. */
export async function POST(req: Request) {
  let body: { projectId?: string; rows?: { locationId: string; values: Record<string, string> }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  }
  const { projectId, rows } = body ?? {};
  if (!projectId || !Array.isArray(rows)) {
    return NextResponse.json({ ok: false, error: "projectId and rows required" }, { status: 400 });
  }
  const r = await bulkSubmitLocations({ projectId, rows });
  return NextResponse.json(r, { status: r.ok ? 200 : r.error === "not_contact" ? 403 : 400 });
}
