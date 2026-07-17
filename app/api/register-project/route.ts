import { NextResponse } from "next/server";
import { registerForProject } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Self-enroll the signed-in account in a project (in-web /register picker). */
export async function POST(req: Request) {
  let projectId = "";
  try {
    const body = await req.json();
    projectId = String(body?.projectId ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  }
  if (!projectId) {
    return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
  }
  const r = await registerForProject(projectId);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
