import { NextResponse } from "next/server";
import { submitLocation } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Web submission write-path: persists one location's monthly data as the signed-in LINE user
 *  (cookie). The DB trigger projects it back to the bot's monitor_submissions. */
export async function POST(req: Request) {
  let body: { projectId?: string; locationId?: string; values?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const { projectId, locationId, values } = body ?? {};
  if (!projectId || !locationId) {
    return NextResponse.json({ error: "projectId and locationId required" }, { status: 400 });
  }
  const r = await submitLocation({ projectId, locationId, values: values ?? {} });
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
