import { NextResponse } from "next/server";
import { requestEditLocations } from "@/lib/data";

export const dynamic = "force-dynamic";

/** A web user asks to edit an already-verified (locked) location list → flags it for admin approval. */
export async function POST(req: Request) {
  let body: { projectId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const { projectId } = body ?? {};
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const r = await requestEditLocations(projectId);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
