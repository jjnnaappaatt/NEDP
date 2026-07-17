import { NextResponse } from "next/server";
import { requestIntegration } from "@/lib/data";

export const dynamic = "force-dynamic";

/** A registered project member asks to enable individual-data integration → pending admin approval
 *  (web_request_integration guards project existence / already-enabled / one open request). */
export async function POST(req: Request) {
  let body: { projectId?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const { projectId, note } = body ?? {};
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const r = await requestIntegration(projectId, note);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
