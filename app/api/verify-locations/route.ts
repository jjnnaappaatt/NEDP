import { NextResponse } from "next/server";
import { verifyLocations } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Persist a project's location-list verification (who/when) → also writes back to the bot. */
export async function POST(req: Request) {
  let body: { projectId?: string; verifiedBy?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  if (!body?.projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }
  const r = await verifyLocations({ projectId: body.projectId, verifiedBy: body.verifiedBy ?? "" });
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
