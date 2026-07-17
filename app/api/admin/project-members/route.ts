import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getProjectMembers } from "@/lib/data";

/** GET ?uuid=<web project id> → registered members, for the head/avatar picker. Admin-gated. */
export async function GET(req: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ members: [] }, { status: 401 });
  const uuid = new URL(req.url).searchParams.get("uuid") ?? "";
  if (!uuid) return NextResponse.json({ members: [] });
  return NextResponse.json({ members: await getProjectMembers(uuid) });
}
