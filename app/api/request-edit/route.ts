import { NextResponse } from "next/server";
import { requestEditLocation } from "@/lib/data";

export const dynamic = "force-dynamic";

/** A web user requests to edit a locked (submitted) location → flags it for admin approval. */
export async function POST(req: Request) {
  let body: { projectId?: string; locationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const { projectId, locationId } = body ?? {};
  if (!projectId || !locationId) {
    return NextResponse.json({ error: "projectId and locationId required" }, { status: 400 });
  }
  const r = await requestEditLocation({ projectId, locationId });
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
