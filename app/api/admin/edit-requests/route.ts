import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { approveEditRequest, rejectEditRequest } from "@/lib/data";

/** POST { action: 'approve'|'reject', kind: 'monthly'|'location', id } → decide an edit-request. Admin-gated. */
export async function POST(req: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { action?: string; kind?: string; id?: string };
  const kind = b.kind === "location" ? "location" : b.kind === "monthly" ? "monthly" : null;
  if (!kind || !b.id) return NextResponse.json({ ok: false, error: "kind and id required" }, { status: 400 });
  const r = b.action === "reject"
    ? await rejectEditRequest(kind, b.id)
    : await approveEditRequest(kind, b.id);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
