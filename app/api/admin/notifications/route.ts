import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getAdminNotifications } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Admin bell feed: open issues + pending edit/head requests + overdue projects. Admin-gated. */
export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ items: [] }, { status: 401 });
  return NextResponse.json({ items: await getAdminNotifications() });
}
