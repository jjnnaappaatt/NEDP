import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { updateMonitorSettings } from "@/lib/data";

/** POST a partial MonitorSettings patch → monitor_settings (the Railway reminder daemon reads it live). */
export async function POST(req: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Partial<{
    notificationsEnabled: boolean; locationRemindersEnabled: boolean;
    deadlineDay: number; advanceDays: number; overdueEveryDays: number; sendHour: number;
  }>;
  return NextResponse.json(await updateMonitorSettings(b));
}
