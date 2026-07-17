import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { approveHeadRequest, rejectHeadRequest } from "@/lib/data";

/** POST { action: approve|reject, requestId }. Admin-gated. (Approve's LINE congrats push is Wave B.) */
export async function POST(req: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { action?: string; requestId?: string };
  const requestId = String(b.requestId ?? "");
  if (!requestId) return NextResponse.json({ ok: false, error: "requestId required" }, { status: 400 });
  if (b.action === "approve") return NextResponse.json(await approveHeadRequest(requestId));
  if (b.action === "reject") return NextResponse.json(await rejectHeadRequest(requestId));
  return NextResponse.json({ ok: false, error: "bad action" }, { status: 400 });
}
