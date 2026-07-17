import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { resolveIssue } from "@/lib/data";

/** POST { id, status: open|resolved } → toggle a monitor_issues row. Admin-gated. */
export async function POST(req: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { id?: number; status?: string };
  const id = Number(b.id);
  const status = b.status === "resolved" ? "resolved" : "open";
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  return NextResponse.json(await resolveIssue(id, status));
}
