/**
 * Manual LINE reminders (submit / location) + the monitor_notifications log, and ลงพื้นที่ (site
 * visits) create/send/cancel/RSVP. Depends on ./_core and ./dashboard (getAllProjectStatuses for the
 * "who is still pending" bulk send); nothing lower-level imports this module.
 */
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pushMessages, statusFlex, visitInviteFlex } from "@/lib/line/push";
import { LIFF } from "@/lib/line/liff";
import { reportMonthBE, reminderText, splitProvinces, type ReminderType } from "./_core";
import { getAllProjectStatuses } from "./dashboard";

export type ReminderResult = { ok: boolean; projectName: string; sent: number; failed: number; skipped: number; error?: string };

/** Push a manual reminder to every active LINE contact of ONE project and log each attempt to
 *  monitor_notifications (channel 'line'/'none'; report_month in Thai-BE to match the bot's log). */
export async function sendProjectReminder(
  webProjectId: string, type: ReminderType,
): Promise<ReminderResult> {
  const db = supabaseAdmin();
  const { data: proj } = await db.from("projects").select("name,source_project_id").eq("id", webProjectId).maybeSingle();
  const src = proj?.source_project_id as number | null | undefined;
  const projectName = (proj?.name as string) ?? "";
  if (!src) return { ok: false, projectName, sent: 0, failed: 0, skipped: 0, error: "no_monitor_project" };

  const { data: contacts } = await db.from("monitor_contacts")
    .select("line_user_id,active").eq("project_id", src).eq("active", true);
  const month = reportMonthBE();
  const reminderCol = type === "submit" ? "manual" : "location";
  let sent = 0, failed = 0, skipped = 0;
  const rows = (contacts ?? []) as { line_user_id: string | null; active: boolean }[];

  for (const c of rows) {
    const now = new Date().toISOString();
    if (!c.line_user_id) {
      skipped++;
      await db.from("monitor_notifications").insert({
        project_id: src, report_month: month, channel: "none", recipient: null,
        reminder_type: reminderCol, status: "skipped", error: "no_line_id", sent_at: now,
      });
      continue;
    }
    const r = await pushMessages(c.line_user_id, [statusFlex({
      tone: "warning",
      headline: type === "submit" ? "📤 แจ้งเตือนส่งข้อมูลรายเดือน" : "📍 แจ้งเตือนยืนยันพื้นที่",
      title: projectName,
      button: type === "submit"
        ? { label: "ส่งข้อมูล", uri: LIFF("/submit") }
        : { label: "ยืนยันพื้นที่", uri: LIFF("/status") },
      altText: reminderText(type, projectName),
    })]);
    if (r.ok) sent++; else failed++;
    await db.from("monitor_notifications").insert({
      project_id: src, report_month: month, channel: "line", recipient: c.line_user_id,
      reminder_type: reminderCol, status: r.ok ? "sent" : "failed",
      error: r.error ?? null, provider_message_id: r.messageId ?? null, sent_at: now,
    });
  }
  return { ok: failed === 0, projectName, sent, failed, skipped };
}

/** Bulk: remind every project that is still "ค้าง" for this type. submit → not fully submitted this
 *  month; location → no verified location list yet. */
export async function sendReminderToPending(type: ReminderType): Promise<{ results: ReminderResult[]; sent: number; failed: number; skipped: number }> {
  const db = supabaseAdmin();
  let targetIds: string[];
  if (type === "submit") {
    const [statuses, { data: activeRows }] = await Promise.all([
      getAllProjectStatuses(),
      db.from("projects").select("id").eq("active", true),
    ]);
    const active = new Set(((activeRows ?? []) as { id: string }[]).map((r) => r.id));
    targetIds = statuses.filter((s) => s.status !== "submitted" && active.has(s.project.id)).map((s) => s.project.id);
  } else {
    const [{ data: projs }, { data: verifs }] = await Promise.all([
      db.from("projects").select("id").eq("active", true),
      db.from("location_verifications").select("project_id").not("verified_at", "is", null),
    ]);
    const verified = new Set((verifs ?? []).map((v) => v.project_id as string));
    targetIds = ((projs ?? []) as { id: string }[]).map((p) => p.id).filter((id) => !verified.has(id));
  }
  const results: ReminderResult[] = [];
  for (const id of targetIds) results.push(await sendProjectReminder(id, type));
  return {
    results,
    sent: results.reduce((s, r) => s + r.sent, 0),
    failed: results.reduce((s, r) => s + r.failed, 0),
    skipped: results.reduce((s, r) => s + r.skipped, 0),
  };
}

export type ReminderLogEntry = {
  id: number; projectName: string; month: string; channel: string; recipient: string | null;
  reminderType: string; status: string; error: string | null; sentAt: string | null;
};

/** Recent monitor_notifications entries (both the Railway daemon's and Vercel's manual sends). */
export async function getReminderLog(limit = 100): Promise<ReminderLogEntry[]> {
  const db = supabaseAdmin();
  const [{ data: logs }, { data: mons }] = await Promise.all([
    db.from("monitor_notifications")
      .select("id,project_id,report_month,channel,recipient,reminder_type,status,error,sent_at")
      .order("sent_at", { ascending: false }).limit(limit),
    db.from("monitor_projects").select("project_id,project_name"),
  ]);
  const nameOf = new Map<number, string>();
  for (const m of (mons ?? []) as { project_id: number; project_name: string }[]) nameOf.set(m.project_id, m.project_name);
  return ((logs ?? []) as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id), projectName: nameOf.get(Number(r.project_id)) ?? `#${r.project_id}`,
    month: String(r.report_month ?? ""), channel: String(r.channel ?? ""),
    recipient: (r.recipient as string) ?? null, reminderType: String(r.reminder_type ?? ""),
    status: String(r.status ?? ""), error: (r.error as string) ?? null, sentAt: (r.sent_at as string) ?? null,
  }));
}

// ── ลงพื้นที่ (site visits) — create / send invite Flex / cancel / view RSVPs ────────────────────
export type SiteVisit = {
  id: number; title: string; hostProvince: string; targetProvinces: string[]; venue: string;
  when: string; details: string; status: string; recipientCount: number; sentCount: number;
  failedCount: number; sentAt: string | null; createdAt: string; yesCount: number; noCount: number;
  imageUrl: string | null;
};
export type VisitRsvp = { id: number; contactName: string | null; projectNames: string | null; response: string; respondedAt: string | null };

/** Distinct provinces that have projects (for the visit target picker), from monitor_project_areas. */
export async function getMonitorProvinces(): Promise<string[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("monitor_project_areas").select("province");
  return [...new Set(((data ?? []) as { province: string | null }[]).map((r) => r.province).filter(Boolean) as string[])].sort();
}

export async function getSiteVisits(): Promise<SiteVisit[]> {
  const db = supabaseAdmin();
  const [{ data: visits }, { data: rsvps }] = await Promise.all([
    db.from("monitor_site_visits")
      .select("id,title,host_province,target_provinces,venue,event_when,details,status,recipient_count,sent_count,failed_count,sent_at,created_at,image_url")
      .order("created_at", { ascending: false }),
    db.from("monitor_site_visit_rsvps").select("visit_id,response"),
  ]);
  const yes = new Map<number, number>(), no = new Map<number, number>();
  for (const r of (rsvps ?? []) as { visit_id: number; response: string }[]) {
    const m = r.response === "yes" ? yes : no;
    m.set(r.visit_id, (m.get(r.visit_id) ?? 0) + 1);
  }
  return ((visits ?? []) as Record<string, unknown>[]).map((v) => ({
    id: Number(v.id), title: String(v.title ?? ""), hostProvince: String(v.host_province ?? ""),
    targetProvinces: splitProvinces(v.target_provinces as string | null), venue: String(v.venue ?? ""),
    when: String(v.event_when ?? ""), details: String(v.details ?? ""), status: String(v.status ?? "draft"),
    recipientCount: Number(v.recipient_count ?? 0), sentCount: Number(v.sent_count ?? 0),
    failedCount: Number(v.failed_count ?? 0), sentAt: (v.sent_at as string) ?? null,
    createdAt: String(v.created_at ?? ""), yesCount: yes.get(Number(v.id)) ?? 0, noCount: no.get(Number(v.id)) ?? 0,
    imageUrl: (v.image_url as string) ?? null,
  }));
}

export async function getVisitRsvps(visitId: number): Promise<VisitRsvp[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("monitor_site_visit_rsvps")
    .select("id,contact_name,project_names,response,responded_at")
    .eq("visit_id", visitId).order("responded_at", { ascending: false });
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id), contactName: (r.contact_name as string) ?? null, projectNames: (r.project_names as string) ?? null,
    response: String(r.response ?? ""), respondedAt: (r.responded_at as string) ?? null,
  }));
}

export async function createSiteVisit(input: {
  title: string; hostProvince: string; targetProvinces: string[]; venue: string; when: string; details: string;
  imageUrl?: string | null; by?: string;
}): Promise<{ ok: boolean; id?: number; error?: string }> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("monitor_site_visits").insert({
    title: input.title, host_province: input.hostProvince,
    target_provinces: input.targetProvinces.join(","), venue: input.venue,
    event_when: input.when, details: input.details, image_url: input.imageUrl ?? null,
    status: "draft", created_by: input.by ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: Number(data.id) };
}

export async function cancelSiteVisit(id: number): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const { error } = await db.from("monitor_site_visits").update({ status: "cancelled" }).eq("id", id);
  return { ok: !error, error: error?.message };
}

/** Push the invite Flex to every active LINE contact whose project operates in a target province. */
export async function sendSiteVisit(id: number): Promise<{ ok: boolean; sent: number; failed: number; error?: string }> {
  const db = supabaseAdmin();
  const { data: v } = await db.from("monitor_site_visits")
    .select("id,title,host_province,target_provinces,venue,event_when,details,status,image_url").eq("id", id).maybeSingle();
  if (!v) return { ok: false, sent: 0, failed: 0, error: "not_found" };
  if (v.status === "cancelled") return { ok: false, sent: 0, failed: 0, error: "cancelled" };
  const targets = splitProvinces(v.target_provinces as string | null);
  if (!targets.length) return { ok: false, sent: 0, failed: 0, error: "no_target_provinces" };

  const { data: areas } = await db.from("monitor_project_areas").select("project_id,province").in("province", targets);
  const pids = [...new Set(((areas ?? []) as { project_id: number }[]).map((a) => a.project_id))];
  if (!pids.length) return { ok: false, sent: 0, failed: 0, error: "no_projects_in_provinces" };

  const { data: contacts } = await db.from("monitor_contacts")
    .select("line_user_id").in("project_id", pids).eq("active", true).not("line_user_id", "is", null);
  const recipients = [...new Set(((contacts ?? []) as { line_user_id: string }[]).map((c) => c.line_user_id))];
  if (!recipients.length) return { ok: false, sent: 0, failed: 0, error: "no_recipients" }; // don't flip to 'sent'

  const flex = visitInviteFlex({
    id: Number(v.id), title: String(v.title ?? ""), hostProvince: String(v.host_province ?? ""),
    venue: String(v.venue ?? ""), when: String(v.event_when ?? ""), details: String(v.details ?? ""),
    imageUrl: (v.image_url as string) ?? null,
  });
  let sent = 0, failed = 0;
  for (const to of recipients) {
    const r = await pushMessages(to, [flex]);
    if (r.ok) sent++; else failed++;
  }
  await db.from("monitor_site_visits").update({
    status: "sent", recipient_count: recipients.length, sent_count: sent, failed_count: failed,
    sent_at: new Date().toISOString(),
  }).eq("id", id);
  return { ok: failed === 0, sent, failed };
}
