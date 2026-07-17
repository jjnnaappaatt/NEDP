import { NextResponse } from "next/server";
import { runReminderPass, runLocationReminderPass, bangkokHour } from "@/lib/line/reminders";
import { getMonitorSettings } from "@/lib/data";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // many projects × contacts

/** Reminder cron. Supabase pg_cron pings this hourly (with `Authorization: Bearer $CRON_SECRET`); we only
 *  do work when the current Bangkok hour matches the admin-configured send hour, so the delivery time is
 *  DB-driven rather than baked into the schedule. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = new Date();
  // Send-hour gate: the scheduler fires every hour, but reminders go out only in the configured hour.
  const cfg = await getMonitorSettings();
  const hour = bangkokHour(now);
  if (hour !== cfg.sendHour) {
    return NextResponse.json({ ok: true, skipped: "outside send hour", bkkHour: hour, sendHour: cfg.sendHour });
  }
  const reminders = await runReminderPass(now, false);
  const locations = await runLocationReminderPass(now, false);
  const sum = (arr: { sent: number; failed: number; skipped: number }[]) => ({
    projects: arr.length,
    sent: arr.reduce((s, r) => s + r.sent, 0),
    failed: arr.reduce((s, r) => s + r.failed, 0),
    skipped: arr.reduce((s, r) => s + r.skipped, 0),
  });
  return NextResponse.json({ ok: true, at: now.toISOString(), reminders: sum(reminders), locations: sum(locations) });
}
