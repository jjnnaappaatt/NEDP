import { NextResponse } from "next/server";
import { requestToBeHead } from "@/lib/data";

export const dynamic = "force-dynamic";

/** A registered, LINE-linked member asks to become a headless project's หัวหน้าโครงการ → pending
 *  admin approval (web_request_head guards membership / LINE / no-existing-head). */
export async function POST(req: Request) {
  let body: { projectId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const { projectId } = body ?? {};
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const r = await requestToBeHead(projectId);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
