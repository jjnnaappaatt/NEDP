import { NextResponse } from "next/server";
import { unregisterForProject } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Purge: the signed-in account unregisters from a project (submitted data kept; project hidden). */
export async function POST(req: Request) {
  let body: { projectId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const { projectId } = body ?? {};
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }
  const r = await unregisterForProject(projectId);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
