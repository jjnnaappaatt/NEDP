import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getMonitorSettings } from "@/lib/data";
import { pushMessages, statusFlex } from "./push";
import { LIFF } from "./liff";

/**
 * Daily reminder pass — ported from aai_mvp/app/reminders.py to run as a Vercel cron (was Railway's daemon).
 * Thai-BE report_month, advance/due/overdue escalation (one per month per project, idempotent via
 * monitor_notifications), + a location-verify nudge. All day comparisons are in Bangkok wall-clock.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://your-app.example";
const THAI_MONTH_ABBR = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

type Db = ReturnType<typeof supabaseAdmin>;
type ReminderType = "advance" | "due" | "overdue" | "location";
export type PassSummary = { projectId: number; projectName: string; reminderType: ReminderType; sent: number; failed: number; skipped: number };

// ── Bangkok-day helpers (UTC-midnight instants so day-granular comparisons are exact) ──────────────
function bkkParts(now: Date) {
  const b = new Date(now.getTime() + 7 * 3600 * 1000);
  return { y: b.getUTCFullYear(), m: b.getUTCMonth() + 1, d: b.getUTCDate() };
}
function asOfCivil(now: Date): Date { const p = bkkParts(now); return new Date(Date.UTC(p.y, p.m - 1, p.d)); }
function daysBetween(a: Date, b: Date): number { return Math.floor((a.getTime() - b.getTime()) / 86400000); }
function currentReportMonth(now: Date): string { const p = bkkParts(now); return `${p.y + 543}-${String(p.m).padStart(2, "0")}`; }
/** Current Bangkok hour (0–23) — the cron route gates delivery to the admin-configured send hour with this. */
export function bangkokHour(now: Date): number { return new Date(now.getTime() + 7 * 3600 * 1000).getUTCHours(); }
function gregYearMonth(rm: string): [number, number] { const [by, m] = rm.split("-"); return [Number(by) - 543, Number(m)]; }
function deadlineDate(rm: string, deadlineDay: number): Date {
  const [gy, m] = gregYearMonth(rm);
  const last = new Date(Date.UTC(gy, m, 0)).getUTCDate();
  return new Date(Date.UTC(gy, m - 1, Math.min(deadlineDay || 25, last)));
}
function deadlineLabel(rm: string, deadlineDay: number): string {
  const d = deadlineDate(rm, deadlineDay);
  return `${d.getUTCDate()} ${THAI_MONTH_ABBR[d.getUTCMonth() + 1]} ${rm.split("-")[0]}`;
}
function monthLabelBE(rm: string): string { const [by, m] = rm.split("-"); return `${THAI_MONTH_ABBR[Number(m)]} ${by}`; }

function nextReminderType(
  asOf: Date, deadline: Date, satisfied: Set<string>, lastOverdue: Date | null, advanceDays: number, overdueEveryDays: number,
): "advance" | "due" | "overdue" | null {
  const advanceOn = new Date(deadline); advanceOn.setUTCDate(advanceOn.getUTCDate() - advanceDays);
  if (asOf < advanceOn) return null;
  if (asOf < deadline) return satisfied.has("advance") ? null : "advance";
  const dueWindow = new Date(deadline); dueWindow.setUTCDate(dueWindow.getUTCDate() + overdueEveryDays);
  if (asOf < dueWindow) return satisfied.has("due") ? null : "due";
  if (!lastOverdue) return "overdue";
  // Space overdue re-sends civil-day↔civil-day (asOfCivil the last send too) so overdueEveryDays=1 is truly
  // daily under the send-hour gate — comparing a civil-midnight to the raw sent instant floored to 0 the next
  // day (every-other-day). Same basis as the location nudge.
  return daysBetween(asOf, asOfCivil(lastOverdue)) >= overdueEveryDays ? "overdue" : null;
}

function reminderText(type: ReminderType, projectName: string, mLabel: string, dLabel: string): string {
  if (type === "location") {
    return `📍 กรุณายืนยันพื้นที่ลงพื้นที่ของโครงการ\n\nโครงการ: ${projectName}\n\nระบบยังไม่ได้รับการยืนยันพื้นที่ของโครงการท่าน\nกรุณายืนยันพื้นที่ผ่านลิงก์ด้านล่าง:\n${APP_URL}/status\n\n(เมื่อยืนยันแล้ว ระบบจะหยุดแจ้งเตือนเรื่องนี้โดยอัตโนมัติ)`;
  }
  const lead = type === "advance" ? "⏰ ใกล้ถึงกำหนดส่งข้อมูลรายเดือน"
    : type === "due" ? "📌 วันนี้เป็นกำหนดส่งข้อมูลรายเดือน"
      : "⚠️ เลยกำหนดส่งข้อมูลรายเดือนแล้ว";
  return `${lead}\n\nโครงการ: ${projectName}\nเดือนรายงาน: ${mLabel}\nกำหนดส่ง: ${dLabel}\n\nกรุณากรอกผลการดำเนินงานผ่านลิงก์ด้านล่าง:\n${APP_URL}/submit\n\n(หากส่งข้อมูลเรียบร้อยแล้ว ระบบจะหยุดแจ้งเตือนโดยอัตโนมัติ)`;
}

/** Flex card per reminder type — color-coded urgency + a LIFF deep-link button; the full plain text
 *  travels as altText so notification previews / degraded clients lose nothing vs the old pushes. */
function reminderFlex(type: ReminderType, projectName: string, mLabel: string, dLabel: string, altText: string) {
  if (type === "location") {
    return statusFlex({
      tone: "warning", headline: "📍 กรุณายืนยันพื้นที่ลงพื้นที่", title: projectName,
      rows: [["สถานะ", "ยังไม่ได้ยืนยันรายการพื้นที่"]],
      button: { label: "ยืนยันพื้นที่", uri: LIFF("/status") }, altText,
    });
  }
  const headline = type === "advance" ? "⏰ ใกล้ถึงกำหนดส่งข้อมูลรายเดือน"
    : type === "due" ? "📌 วันนี้เป็นกำหนดส่งข้อมูลรายเดือน"
      : "⚠️ เลยกำหนดส่งข้อมูลรายเดือนแล้ว";
  return statusFlex({
    tone: type === "overdue" ? "danger" : "warning", headline, title: projectName,
    rows: [["เดือนรายงาน", mLabel], ["กำหนดส่ง", dLabel]],
    button: { label: "ส่งข้อมูล", uri: LIFF("/submit") }, altText,
  });
}

async function dispatch(
  db: Db, project: { project_id: number; project_name: string }, reportMonth: string,
  type: ReminderType, mLabel: string, dLabel: string, dryRun: boolean,
): Promise<{ sent: number; failed: number; skipped: number }> {
  const text = reminderText(type, project.project_name, mLabel, dLabel);
  const flex = reminderFlex(type, project.project_name, mLabel, dLabel, text);
  const { data: contacts } = await db.from("monitor_contacts")
    .select("display_name,line_user_id").eq("project_id", project.project_id).eq("active", true);
  const rows = (contacts ?? []) as { display_name: string | null; line_user_id: string | null }[];
  let sent = 0, failed = 0, skipped = 0;

  if (!rows.length) {
    skipped++;
    if (!dryRun) await db.from("monitor_notifications").insert({
      project_id: project.project_id, report_month: reportMonth, channel: "none", recipient: null,
      reminder_type: type, status: "skipped", error: "no registered contact", sent_at: new Date().toISOString(),
    });
    return { sent, failed, skipped };
  }
  for (const c of rows) {
    const now = new Date().toISOString();
    if (c.line_user_id) {
      let ok = true, err: string | null = null, msgId: string | null = null;
      if (!dryRun) { const r = await pushMessages(c.line_user_id, [flex]); ok = r.ok; err = r.error ?? null; msgId = r.messageId ?? null; }
      if (ok) sent++; else failed++;
      if (!dryRun) await db.from("monitor_notifications").insert({
        project_id: project.project_id, report_month: reportMonth, channel: "line", recipient: c.line_user_id,
        reminder_type: type, status: ok ? "sent" : "failed", error: err, provider_message_id: msgId, sent_at: now,
      });
    } else {
      skipped++;
      if (!dryRun) await db.from("monitor_notifications").insert({
        project_id: project.project_id, report_month: reportMonth, channel: "none", recipient: c.display_name || null,
        reminder_type: type, status: "skipped", error: "no line_user_id", sent_at: now,
      });
    }
  }
  return { sent, failed, skipped };
}

/** Monthly submission reminders (advance/due/overdue). Skips completed submissions; idempotent per month. */
export async function runReminderPass(asOf: Date = new Date(), dryRun = false): Promise<PassSummary[]> {
  const cfg = await getMonitorSettings();
  if (!cfg.notificationsEnabled) return [];
  const db = supabaseAdmin();
  const now = asOfCivil(asOf);
  const reportMonth = currentReportMonth(asOf);
  const deadline = deadlineDate(reportMonth, cfg.deadlineDay);
  const mLabel = monthLabelBE(reportMonth), dLabel = deadlineLabel(reportMonth, cfg.deadlineDay);

  const { data: projects } = await db.from("monitor_projects").select("project_id,project_name").eq("active", true);
  const out: PassSummary[] = [];
  for (const p of (projects ?? []) as { project_id: number; project_name: string }[]) {
    const { data: sub } = await db.from("monitor_submissions").select("status")
      .eq("project_id", p.project_id).eq("report_month", reportMonth).maybeSingle();
    if (sub?.status === "completed") continue;

    const { data: logs } = await db.from("monitor_notifications").select("reminder_type,status,sent_at")
      .eq("project_id", p.project_id).eq("report_month", reportMonth);
    const satisfied = new Set<string>(); const overdue: number[] = [];
    for (const l of (logs ?? []) as { reminder_type: string; status: string; sent_at: string | null }[]) {
      // Only a real delivery counts as "done" — a `skipped` (no reachable contact) must not suppress the
      // reminder once the project gains a LINE contact mid-month, and only `sent` overdues space the next one.
      if (l.status === "sent") satisfied.add(l.reminder_type);
      if (l.reminder_type === "overdue" && l.status === "sent" && l.sent_at) overdue.push(new Date(l.sent_at).getTime());
    }
    const lastOverdue = overdue.length ? new Date(Math.max(...overdue)) : null;
    const rtype = nextReminderType(now, deadline, satisfied, lastOverdue, cfg.advanceDays, cfg.overdueEveryDays);
    if (!rtype) continue;
    const r = await dispatch(db, p, reportMonth, rtype, mLabel, dLabel, dryRun);
    out.push({ projectId: p.project_id, projectName: p.project_name, reminderType: rtype, ...r });
  }
  return out;
}

/** ยืนยันพื้นที่ nudge — active projects with no location_verified_at, repeated every `overdueEveryDays`
 *  days (like the overdue submission reminder) until the area is verified; auto-stops when verified. */
export async function runLocationReminderPass(asOf: Date = new Date(), dryRun = false): Promise<PassSummary[]> {
  const cfg = await getMonitorSettings();
  if (!cfg.notificationsEnabled || !cfg.locationRemindersEnabled) return [];
  const db = supabaseAdmin();
  const today = asOfCivil(asOf); // Bangkok civil-day midnight, for day-granular spacing
  const reportMonth = currentReportMonth(asOf);
  const mLabel = monthLabelBE(reportMonth), dLabel = deadlineLabel(reportMonth, cfg.deadlineDay);

  const { data: projects } = await db.from("monitor_projects")
    .select("project_id,project_name").eq("active", true).is("location_verified_at", null);
  const out: PassSummary[] = [];
  for (const p of (projects ?? []) as { project_id: number; project_name: string }[]) {
    // Repeat every `overdueEveryDays` days until verified. Anchored on ACTUAL delivery only (a `skipped` —
    // no reachable contact — must not suppress it once LINE is linked), compared civil-day↔civil-day
    // (asOfCivil on both sides) so overdueEveryDays=1 is truly daily under the send-hour gate.
    const { data: last } = await db.from("monitor_notifications").select("sent_at")
      .eq("project_id", p.project_id).eq("reminder_type", "location").eq("status", "sent")
      .order("sent_at", { ascending: false }).limit(1);
    const lastSent = last?.[0]?.sent_at ? new Date(last[0].sent_at as string) : null;
    if (lastSent && daysBetween(today, asOfCivil(lastSent)) < cfg.overdueEveryDays) continue;
    const r = await dispatch(db, p, reportMonth, "location", mLabel, dLabel, dryRun);
    out.push({ projectId: p.project_id, projectName: p.project_name, reminderType: "location", ...r });
  }
  return out;
}
