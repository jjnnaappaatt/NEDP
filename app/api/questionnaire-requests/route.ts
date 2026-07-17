import { NextResponse } from "next/server";
import { decideQuestionnaireRequestAsHead } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Head-facing: the PROJECT HEAD approves/rejects a questionnaire request for their own project. The
 *  head check lives inside decideQuestionnaireRequestAsHead (verifies the caller heads the request's
 *  project); approval runs the same surveyToSchema → upsert → assign pipeline as the admin path. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { requestId?: string; action?: string };
  const requestId = String(b.requestId ?? "");
  const action = b.action === "reject" ? "reject" : "approve";
  if (!requestId) return NextResponse.json({ ok: false, error: "requestId required" }, { status: 400 });
  const res = await decideQuestionnaireRequestAsHead(requestId, action);
  const status = res.ok ? 200 : res.error === "not_head" ? 403 : res.error === "not_found" ? 404 : 400;
  return NextResponse.json(res, { status });
}
