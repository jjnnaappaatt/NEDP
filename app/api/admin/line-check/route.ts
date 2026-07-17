import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getBotInfo } from "@/lib/line/push";

/** GET → verify the LINE access token is valid (read-only bot/info; no message sent). Admin-gated. */
export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getBotInfo());
}
