import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { runReminderPass, runLocationReminderPass } from "@/lib/line/reminders";

/** GET → dry-run the daily reminder passes (no sends, no log writes) so an admin can preview exactly what
 *  the cron would send today. Admin-gated. */
export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const now = new Date();
  const [reminders, locations] = await Promise.all([
    runReminderPass(now, true),
    runLocationReminderPass(now, true),
  ]);
  return NextResponse.json({ ok: true, reminders, locations });
}
