import { NextResponse } from "next/server";
import { submitPersonAssessment } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Submit one person's 4-domain AAI for a month; Overall computed server-side (manual mode). Gated in the data layer. */
export async function POST(req: Request) {
  let body: Parameters<typeof submitPersonAssessment>[0];
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  }
  if (!body?.personId || !body?.projectId) {
    return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
  }
  const r = await submitPersonAssessment(body);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
