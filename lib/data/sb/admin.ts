/**
 * Admin portal — the unified คำขอแก้ไขข้อมูล queue + monitor_* management (project CRUD, head/avatar,
 * head-requests, settings, issues, registrations) + the web issue-report writer. Operates on the shared
 * monitor_* tables + existing RPCs via the service-role client. Imports shared internals from ./_core only.
 */
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pushMessages, statusFlex } from "@/lib/line/push";
import { LIFF } from "@/lib/line/liff";
import type { IssueReport } from "@/types";
import { QUESTIONNAIRE_REGISTRY } from "@/lib/questionnaire/registry";
import { surveyToSchema, type RawSurvey } from "@/lib/questionnaire/surveys";
import type { QuestionnaireSchema } from "@/lib/questionnaire/schema";
import { meId, APP_URL, DEFAULT_SETTINGS, type MonitorSettings } from "./_core";

// ── Admin: unified คำขอแก้ไขข้อมูล queue (monthly submissions + location lists) ────────────────
export type EditRequest = {
  kind: "monthly" | "location";
  /** submission id (monthly) | project id (location) — the approve/reject key */
  id: string;
  projectName: string;
  areaLabel: string;
  requesterName: string;
  requestedAt: string;
  month?: string;
};

/** Pending edit-requests across both kinds, newest first. Reuses the existing monthly RPC
 *  (web_list_edit_requests, also used by Railway /m/edits) + the new location RPC. */
export async function getEditRequests(): Promise<EditRequest[]> {
  const db = supabaseAdmin();
  const [{ data: m }, { data: l }] = await Promise.all([
    db.rpc("web_list_edit_requests"),
    db.rpc("web_list_location_edit_requests"),
  ]);
  const monthly: EditRequest[] = ((m ?? []) as Record<string, unknown>[]).map((r) => ({
    kind: "monthly", id: String(r.submission_id), projectName: String(r.project_name ?? ""),
    areaLabel: `ต.${r.tambon ?? "—"}${r.amphoe ? ` อ.${r.amphoe}` : ""}`,
    requesterName: String(r.account_name || r.requested_by || ""),
    requestedAt: String(r.edit_requested_at ?? ""), month: String(r.year_month ?? ""),
  }));
  const location: EditRequest[] = ((l ?? []) as Record<string, unknown>[]).map((r) => ({
    kind: "location", id: String(r.project_id), projectName: String(r.project_name ?? ""),
    areaLabel: "รายการพื้นที่ทั้งโครงการ", requesterName: String(r.requested_by ?? ""),
    requestedAt: String(r.requested_at ?? ""),
  }));
  return [...monthly, ...location].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

/** Approve an edit-request → unlocks the user (monthly: status→draft; location: opens the edit window). */
export async function approveEditRequest(
  kind: "monthly" | "location", id: string,
): Promise<{ ok: boolean; error?: string; lineWarning?: boolean }> {
  const db = supabaseAdmin();
  if (kind === "monthly") {
    const { data, error } = await db.rpc("web_approve_edit", { p_submission: id });
    if (error) return { ok: false, error: error.message };
    const row = (Array.isArray(data) ? data[0] : null) as { line_user_id?: string; project_name?: string; tambon?: string } | null;
    if (row?.line_user_id) {
      // Approval already committed in the DB; a failed LINE push must not fail the request — surface it instead.
      const push = await pushMessages(row.line_user_id, [statusFlex({
        tone: "success", headline: "✅ อนุมัติคำขอแก้ไขข้อมูลแล้ว",
        title: row.project_name ?? "",
        rows: row.tambon ? [["พื้นที่", `ต.${row.tambon}`]] : undefined,
        button: { label: "เปิดหน้าส่งข้อมูล", uri: LIFF("/submit") },
        altText: `✅ อนุมัติคำขอแก้ไขข้อมูลแล้ว\nโครงการ “${row.project_name ?? ""}”${row.tambon ? ` · ต.${row.tambon}` : ""}\nแก้ไขและส่งข้อมูลใหม่ได้แล้ว: ${APP_URL}/submit`,
      })]);
      if (!push.ok) return { ok: true, lineWarning: true };
    }
    return { ok: true };
  }
  const { data, error } = await db.rpc("web_approve_location_edit", { p_project: id });
  return { ok: !error && data === true, error: error?.message };
}

/** Reject an edit-request → clears the request (stays locked; the user may re-request). */
export async function rejectEditRequest(
  kind: "monthly" | "location", id: string,
): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const { data, error } = kind === "monthly"
    ? await db.rpc("web_reject_edit", { p_submission: id })
    : await db.rpc("web_reject_location_edit", { p_project: id });
  return { ok: !error && data === true, error: error?.message };
}

// ════════════════════════════════════════════════════════════════════════════
// Admin portal — monitor_* management (project CRUD, head/avatar, head-requests,
// settings, issues, registrations). Operates on the shared monitor_* tables +
// existing RPCs via the service-role client. LINE-push actions are Wave B.
// ════════════════════════════════════════════════════════════════════════════

export type AdminProject = {
  pid: number; name: string; researcher: string | null; org: string | null; active: boolean;
  projectUuid: string | null; headName: string | null; avatarSet: boolean;
};

/** All NEDP projects (monitor_projects) joined to their web `projects` row for head/avatar state. */
export async function getAdminProjects(): Promise<AdminProject[]> {
  const db = supabaseAdmin();
  const [{ data: mons }, { data: webs }, { data: accts }] = await Promise.all([
    db.from("monitor_projects").select("project_id,project_name,researcher,organization,active").order("project_id"),
    db.from("projects").select("id,source_project_id,head_account_id,avatar_account_id"),
    db.from("accounts").select("id,name"),
  ]);
  const acctName = new Map(((accts ?? []) as { id: string; name: string }[]).map((a) => [a.id, a.name]));
  const webBySrc = new Map(
    ((webs ?? []) as { id: string; source_project_id: number | null; head_account_id: string | null; avatar_account_id: string | null }[])
      .filter((w) => w.source_project_id != null).map((w) => [w.source_project_id as number, w]),
  );
  return ((mons ?? []) as { project_id: number; project_name: string; researcher: string | null; organization: string | null; active: boolean }[])
    .map((m) => {
      const w = webBySrc.get(m.project_id);
      return {
        pid: m.project_id, name: m.project_name, researcher: m.researcher, org: m.organization, active: m.active,
        projectUuid: w?.id ?? null,
        headName: w?.head_account_id ? acctName.get(w.head_account_id) ?? null : null,
        avatarSet: !!w?.avatar_account_id,
      };
    });
}

/** Registered members of a (web) project — for the head/avatar picker. */
export async function getProjectMembers(projectUuid: string): Promise<{ id: string; name: string }[]> {
  const db = supabaseAdmin();
  const { data: regs } = await db.from("project_account_registrations").select("account_id").eq("project_id", projectUuid);
  const ids = [...new Set(((regs ?? []) as { account_id: string }[]).map((r) => r.account_id))];
  if (!ids.length) return [];
  const { data } = await db.from("accounts").select("id,name").in("id", ids).order("name");
  return (data ?? []) as { id: string; name: string }[];
}

export async function createMonitorProject(
  input: { name: string; researcher?: string; org?: string },
): Promise<{ ok: boolean; pid?: number; error?: string }> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("monitor_projects")
    .insert({ project_name: input.name, researcher: input.researcher || null, organization: input.org || null, active: true })
    .select("project_id").single();
  if (error) return { ok: false, error: error.message };
  await db.rpc("sync_monitor_to_spec"); // mirror the new project into the web `projects` table
  return { ok: true, pid: (data as { project_id: number }).project_id };
}

export async function updateMonitorProject(
  pid: number, input: { name?: string; researcher?: string; org?: string; active?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.project_name = input.name;
  if (input.researcher !== undefined) patch.researcher = input.researcher || null;
  if (input.org !== undefined) patch.organization = input.org || null;
  if (input.active !== undefined) patch.active = input.active;
  if (!Object.keys(patch).length) return { ok: true };
  const { error } = await db.from("monitor_projects").update(patch).eq("project_id", pid);
  if (error) return { ok: false, error: error.message };
  await db.rpc("sync_monitor_to_spec");
  return { ok: true };
}

export async function deleteMonitorProject(pid: number): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const { error } = await db.rpc("admin_delete_project", { p_pid: pid });
  return { ok: !error, error: error?.message };
}

export async function setProjectAvatar(sourcePid: number, accountId: string | null): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const { error } = await db.rpc("web_set_project_avatar", { p_source_project_id: sourcePid, p_account: accountId });
  return { ok: !error, error: error?.message };
}

export async function setProjectHead(sourcePid: number, accountId: string | null, by = "admin"): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const { error } = await db.rpc("web_set_project_head", { p_source_project_id: sourcePid, p_account: accountId, p_by: by });
  return { ok: !error, error: error?.message };
}

export type HeadRequest = {
  requestId: string; sourceProjectId: number; projectName: string; accountId: string;
  requesterName: string; requestedAt: string;
};
export async function getHeadRequests(): Promise<HeadRequest[]> {
  const db = supabaseAdmin();
  const { data } = await db.rpc("web_list_head_requests");
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    requestId: String(r.request_id), sourceProjectId: Number(r.source_project_id),
    projectName: String(r.project_name ?? ""), accountId: String(r.account_id),
    requesterName: String(r.requester_name ?? ""), requestedAt: String(r.requested_at ?? ""),
  }));
}
/** Approve a head request (DB only in Wave A; the returned line_user_id drives the Wave B congrats push). */
export async function approveHeadRequest(requestId: string, by = "admin"): Promise<{ ok: boolean; error?: string; lineWarning?: boolean }> {
  const db = supabaseAdmin();
  const { data, error } = await db.rpc("web_approve_head_request", { p_request_id: requestId, p_by: by });
  if (error) return { ok: false, error: error.message };
  const row = (Array.isArray(data) ? data[0] : null) as { line_user_id?: string; project_name?: string } | null;
  if (row?.line_user_id) {
    // Approval already committed in the DB; a failed LINE push must not fail the request — surface it instead.
    const push = await pushMessages(row.line_user_id, [statusFlex({
      tone: "success", headline: "🎉 คุณได้เป็นหัวหน้าโครงการ",
      title: row.project_name ?? "",
      rows: [["สิทธิ์ที่เพิ่ม", "ดูกิจกรรมทีมทั้งหมดของโครงการ"]],
      button: { label: "เปิดระบบ", uri: LIFF("/status") },
      altText: `🎉 ยินดีด้วย! คุณได้รับการอนุมัติเป็นหัวหน้าโครงการ “${row.project_name ?? ""}”\nเปิดระบบ: ${APP_URL}`,
    })]);
    if (!push.ok) return { ok: true, lineWarning: true };
  }
  return { ok: true };
}
export async function rejectHeadRequest(requestId: string, by = "admin"): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const { error } = await db.rpc("web_reject_head_request", { p_request_id: requestId, p_by: by });
  return { ok: !error, error: error?.message };
}

export type IntegrationRequest = {
  requestId: string; projectId: string; sourceProjectId: number | null; projectName: string;
  requesterName: string; requestedAt: string;
};
/** Pending "enable individual-data integration" requests, for the admin approval queue. */
export async function getIntegrationRequests(): Promise<IntegrationRequest[]> {
  const db = supabaseAdmin();
  const { data } = await db.rpc("web_list_integration_requests");
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    requestId: String(r.request_id), projectId: String(r.project_id),
    sourceProjectId: r.source_project_id == null ? null : Number(r.source_project_id),
    projectName: String(r.project_name ?? ""),
    requesterName: String(r.requester_name ?? ""), requestedAt: String(r.requested_at ?? ""),
  }));
}
/** Approve → set projects.individual_integration_enabled + best-effort LINE congrats to the requester. */
export async function approveIntegrationRequest(requestId: string, by = "admin"): Promise<{ ok: boolean; error?: string; lineWarning?: boolean }> {
  const db = supabaseAdmin();
  const { data, error } = await db.rpc("web_approve_integration", { p_request_id: requestId, p_by: by });
  if (error) return { ok: false, error: error.message };
  const row = (Array.isArray(data) ? data[0] : null) as { line_user_id?: string; project_name?: string } | null;
  if (row?.line_user_id) {
    const push = await pushMessages(row.line_user_id, [statusFlex({
      tone: "success", headline: "🎉 เปิดใช้งานการนำเข้าข้อมูลรายบุคคลแล้ว",
      title: row.project_name ?? "",
      rows: [["สิ่งที่ทำได้", "ดาวน์โหลดแบบฟอร์ม + นำเข้าข้อมูลรายบุคคล"]],
      button: { label: "เปิดระบบ", uri: LIFF("/status") },
      altText: `🎉 โครงการ “${row.project_name ?? ""}” เปิดใช้งานการนำเข้าข้อมูลรายบุคคลแล้ว\nเปิดระบบ: ${APP_URL}`,
    })]);
    if (!push.ok) return { ok: true, lineWarning: true };
  }
  return { ok: true };
}
export async function rejectIntegrationRequest(requestId: string, by = "admin"): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const { error } = await db.rpc("web_reject_integration", { p_request_id: requestId, p_by: by });
  return { ok: !error, error: error?.message };
}

// ── Head-submitted "request add questionnaire" queue (portal → admin approve) ──────────────────────
export type QuestionnaireRequest = {
  requestId: string; projectId: string; sourceProjectId: number | null; projectName: string;
  requesterName: string; title: string; includeAai: boolean; questionCount: number; requestedAt: string;
};
export async function getQuestionnaireRequests(): Promise<QuestionnaireRequest[]> {
  const db = supabaseAdmin();
  const { data } = await db.rpc("web_list_questionnaire_requests");
  return ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const payload = r.payload as { questions?: unknown[] } | null;
    return {
      requestId: String(r.request_id), projectId: String(r.project_id),
      sourceProjectId: r.source_project_id == null ? null : Number(r.source_project_id),
      projectName: String(r.project_name ?? ""), requesterName: String(r.requester_name ?? ""),
      title: String(r.title ?? ""), includeAai: r.include_aai === true,
      questionCount: Array.isArray(payload?.questions) ? payload!.questions!.length : 0,
      requestedAt: String(r.requested_at ?? ""),
    };
  });
}
const codeSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9ก-๙]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "custom";
/** Approve → convert the submitted JSON to a schema, create it, and assign it to the project. */
export async function approveQuestionnaireRequest(requestId: string, by = "admin"): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const { data } = await db.rpc("web_get_questionnaire_request", { p_request_id: requestId });
  const row = (Array.isArray(data) ? data[0] : null) as
    { project_id?: string; title?: string; include_aai?: boolean; payload?: RawSurvey; status?: string } | null;
  if (!row || row.status !== "pending") return { ok: false, error: "not_found" };
  const title = String(row.title ?? "แบบสอบถามของโครงการ");
  const code = `${codeSlug(title)}-${String(row.project_id ?? "").slice(0, 8)}`;
  const schema = surveyToSchema(row.payload as RawSurvey, { includeAai: row.include_aai !== false });
  const up = await upsertQuestionnaire(code, "v1.0", title, "survey", schema, by);
  if (!up.ok || !up.id) return { ok: false, error: up.error ?? "upsert failed" };
  const asg = await assignQuestionnaire(String(row.project_id), up.id, [], by);
  if (!asg.ok) return { ok: false, error: asg.error };
  const { error } = await db.rpc("web_decide_questionnaire_request", { p_request_id: requestId, p_status: "approved", p_by: by });
  return { ok: !error, error: error?.message };
}
export async function rejectQuestionnaireRequest(requestId: string, by = "admin"): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const { error } = await db.rpc("web_decide_questionnaire_request", { p_request_id: requestId, p_status: "rejected", p_by: by });
  return { ok: !error, error: error?.message };
}

/** Head-gated decide: the PROJECT HEAD (หัวหน้าโครงการ) approves/rejects a questionnaire request for THEIR
 *  own project. Verifies the caller is that project's head, then reuses the same convert→create→assign
 *  pipeline as the admin path. (The national admin queue remains a backstop.) */
export async function decideQuestionnaireRequestAsHead(
  requestId: string, action: "approve" | "reject",
): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return { ok: false, error: "no_account" };
  const { data: reqRow } = await db.from("project_questionnaire_requests")
    .select("project_id,status").eq("id", requestId).maybeSingle();
  if (!reqRow || reqRow.status !== "pending") return { ok: false, error: "not_found" };
  const { data: proj } = await db.from("projects").select("head_account_id").eq("id", reqRow.project_id).maybeSingle();
  if (!proj || proj.head_account_id !== me) return { ok: false, error: "not_head" };
  const { data: acct } = await db.from("accounts").select("name").eq("id", me).maybeSingle();
  const by = acct?.name ? `หัวหน้าโครงการ: ${String(acct.name)}` : "หัวหน้าโครงการ";
  return action === "approve" ? approveQuestionnaireRequest(requestId, by) : rejectQuestionnaireRequest(requestId, by);
}

// ── Per-project questionnaire registry + assignment (Phase 1) ──────────────────────────────────────
export type QuestionnaireInfo = { id: string; code: string; version: string; title: string; kind: string };
export async function listQuestionnaires(): Promise<QuestionnaireInfo[]> {
  const db = supabaseAdmin();
  const { data } = await db.rpc("web_list_questionnaires");
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), code: String(r.code), version: String(r.version), title: String(r.title), kind: String(r.kind),
  }));
}
/** One questionnaire's schema (for the admin live-preview of an existing "แบบสอบถามในระบบ"). */
export async function getQuestionnaireSchema(id: string): Promise<{ schema: QuestionnaireSchema; kind: string } | null> {
  const db = supabaseAdmin();
  const { data } = await db.from("questionnaires").select("schema_json,kind").eq("id", id).maybeSingle();
  if (!data) return null;
  return { schema: data.schema_json as QuestionnaireSchema, kind: String(data.kind) };
}
export type ProjectQuestionnaire = { projectId: string; questionnaireId: string; modules: string[] };
export async function getProjectQuestionnaires(): Promise<ProjectQuestionnaire[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("project_questionnaires").select("project_id,questionnaire_id,modules");
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    projectId: String(r.project_id), questionnaireId: String(r.questionnaire_id),
    modules: Array.isArray(r.modules) ? (r.modules as string[]) : [],
  }));
}
export async function assignQuestionnaire(projectId: string, questionnaireId: string, modules: string[], by = "admin"): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const { error } = await db.rpc("web_assign_questionnaire", { p_project: projectId, p_questionnaire: questionnaireId, p_modules: modules, p_by: by });
  return { ok: !error, error: error?.message };
}
export async function unassignQuestionnaire(projectId: string, by = "admin"): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const { error } = await db.rpc("web_unassign_questionnaire", { p_project: projectId, p_by: by });
  return { ok: !error, error: error?.message };
}
/** Create/replace one questionnaire (admin JSON import). Idempotent on (code, version). */
export async function upsertQuestionnaire(
  code: string, version: string, title: string, kind: string, schema: unknown, by = "import",
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const db = supabaseAdmin();
  const { data, error } = await db.rpc("web_upsert_questionnaire", {
    p_code: code, p_version: version, p_title: title, p_kind: kind, p_schema: schema, p_by: by,
  });
  return { ok: !error, id: data ? String(data) : undefined, error: error?.message };
}

/** Push the built-in questionnaire schemas (lib/questionnaire/registry) into the DB registry. */
export async function syncQuestionnaireRegistry(): Promise<{ ok: boolean; synced: number; error?: string }> {
  const db = supabaseAdmin();
  let synced = 0;
  for (const e of QUESTIONNAIRE_REGISTRY) {
    const { error } = await db.rpc("web_upsert_questionnaire", {
      p_code: e.code, p_version: e.version, p_title: e.title, p_kind: e.schema.kind, p_schema: e.schema, p_by: "sync",
    });
    if (error) return { ok: false, synced, error: error.message };
    synced++;
  }
  return { ok: true, synced };
}

export async function getMonitorSettings(): Promise<MonitorSettings> {
  const db = supabaseAdmin();
  const { data } = await db.from("monitor_settings")
    .select("notifications_enabled,location_reminders_enabled,deadline_day,advance_days,overdue_every_days,send_hour")
    .eq("id", 1).maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  return {
    notificationsEnabled: data.notifications_enabled, locationRemindersEnabled: data.location_reminders_enabled,
    deadlineDay: data.deadline_day, advanceDays: data.advance_days, overdueEveryDays: data.overdue_every_days,
    sendHour: data.send_hour ?? DEFAULT_SETTINGS.sendHour,
  };
}
export async function updateMonitorSettings(input: Partial<MonitorSettings>): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  // The singleton row id=1 is created by the Railway daemon; patch only the changed columns (UPDATE, not
  // upsert — a partial upsert would re-INSERT and trip the NOT NULL columns it omits).
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: "admin" };
  if (input.notificationsEnabled !== undefined) patch.notifications_enabled = input.notificationsEnabled;
  if (input.locationRemindersEnabled !== undefined) patch.location_reminders_enabled = input.locationRemindersEnabled;
  if (input.deadlineDay !== undefined) patch.deadline_day = Math.max(1, Math.min(28, input.deadlineDay));
  if (input.advanceDays !== undefined) patch.advance_days = Math.max(0, Math.min(28, input.advanceDays));
  if (input.overdueEveryDays !== undefined) patch.overdue_every_days = Math.max(1, Math.min(30, input.overdueEveryDays));
  if (input.sendHour !== undefined) patch.send_hour = Math.max(0, Math.min(23, input.sendHour));
  const { error } = await db.from("monitor_settings").update(patch).eq("id", 1);
  return { ok: !error, error: error?.message };
}

export type AdminIssue = {
  id: number; projectName: string | null; type: string | null; description: string;
  status: string; ticket: string | null; createdAt: string; screenshotUrl: string | null;
};
export async function getAdminIssues(): Promise<AdminIssue[]> {
  const db = supabaseAdmin();
  const [{ data: issues }, { data: mons }] = await Promise.all([
    db.from("monitor_issues").select("id,project_id,type,description,status,ticket,created_at,screenshot_url").order("created_at", { ascending: false }),
    db.from("monitor_projects").select("project_id,project_name"),
  ]);
  const pName = new Map(((mons ?? []) as { project_id: number; project_name: string }[]).map((m) => [m.project_id, m.project_name]));
  return Promise.all(((issues ?? []) as Record<string, unknown>[]).map(async (r) => {
    const path = (r.screenshot_url as string | null) ?? null;
    let screenshotUrl: string | null = null;
    if (path) {
      const { data: signed } = await db.storage.from("issue-screenshots").createSignedUrl(path, 3600);
      screenshotUrl = signed?.signedUrl ?? null;
    }
    return {
      id: Number(r.id), projectName: r.project_id != null ? pName.get(Number(r.project_id)) ?? null : null,
      type: (r.type as string) ?? null, description: String(r.description ?? ""), status: String(r.status ?? "open"),
      ticket: (r.ticket as string) ?? null, createdAt: String(r.created_at ?? ""), screenshotUrl,
    };
  }));
}
/** Toggle an issue. On resolve, close the loop with the reporter: stamp resolved_at (drives the in-app bell for
 *  the reporter's account) and push a LINE notice when the report carries a line_user_id (best-effort, mirrors the
 *  approve-notices). Reopen clears resolved_at so it drops out of the bell. */
export async function resolveIssue(id: number, status: "open" | "resolved"): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  if (status === "resolved") {
    const { data, error } = await db.from("monitor_issues")
      .update({ status, resolved_at: new Date().toISOString() }).eq("id", id)
      .select("line_user_id,ticket").single();
    if (error) return { ok: false, error: error.message };
    const row = data as { line_user_id?: string | null; ticket?: string | null };
    if (row?.line_user_id) {
      await pushMessages(row.line_user_id, [statusFlex({
        tone: "success", headline: "✅ เรื่องที่แจ้งได้รับการแก้ไขแล้ว",
        rows: row.ticket ? [["เลขที่", row.ticket]] : undefined,
        altText: `✅ เรื่องที่คุณแจ้ง${row.ticket ? ` (${row.ticket})` : ""} ได้รับการแก้ไขเรียบร้อยแล้ว\nขอบคุณที่ช่วยแจ้งให้เราทราบค่ะ 🙏`,
      })]);
    }
    return { ok: true };
  }
  const { error } = await db.from("monitor_issues").update({ status, resolved_at: null }).eq("id", id);
  return { ok: !error, error: error?.message };
}

export type RegistrationGroup = {
  pid: number; projectName: string;
  contacts: { name: string | null; channel: string; hasLine: boolean; active: boolean }[];
};
export async function getRegistrations(): Promise<RegistrationGroup[]> {
  const db = supabaseAdmin();
  const [{ data: contacts }, { data: mons }] = await Promise.all([
    db.from("monitor_contacts").select("project_id,display_name,channel_pref,line_user_id,active").order("registered_at", { ascending: false }),
    db.from("monitor_projects").select("project_id,project_name").order("project_id"),
  ]);
  const byPid = new Map<number, RegistrationGroup>();
  for (const m of (mons ?? []) as { project_id: number; project_name: string }[]) {
    byPid.set(m.project_id, { pid: m.project_id, projectName: m.project_name, contacts: [] });
  }
  for (const c of (contacts ?? []) as { project_id: number; display_name: string | null; channel_pref: string; line_user_id: string | null; active: boolean }[]) {
    byPid.get(c.project_id)?.contacts.push({
      name: c.display_name, channel: c.channel_pref, hasLine: !!c.line_user_id, active: c.active,
    });
  }
  return [...byPid.values()];
}

/** A web user's รายงานปัญหา → the SAME monitor_issues queue the admin (/admin/issues) + LINE bot use.
 *  Attributes the signed-in account (name/org/email footer + line_user_id) and attaches an uploaded screenshot. */
export async function submitIssue(
  input: { type: string; description: string; email?: string; screenshotPath?: string },
): Promise<IssueReport> {
  const db = supabaseAdmin();
  const me = await meId();
  const { data: acct } = me
    ? await db.from("accounts").select("name,org,line_user_id").eq("id", me).maybeSingle()
    : { data: null as { name?: string; org?: string | null; line_user_id?: string | null } | null };
  const who = [acct?.name, acct?.org].filter(Boolean).join(" · ");
  const description = [
    input.description.trim(),
    who ? `— ผู้แจ้ง: ${who}` : null,
    input.email ? `— ติดต่อกลับ: ${input.email}` : null,
  ].filter(Boolean).join("\n").slice(0, 2000);
  const now = new Date().toISOString();
  const { data, error } = await db.from("monitor_issues")
    .insert({ type: input.type, description, line_user_id: acct?.line_user_id ?? null, reporter_account_id: me ?? null, status: "open", created_at: now, screenshot_url: input.screenshotPath ?? null })
    .select("id").single();
  if (error || !data) throw new Error(error?.message ?? "issue insert failed");
  const id = Number(data.id);
  const ticket = `NEDP-${1000 + id}`;
  await db.from("monitor_issues").update({ ticket }).eq("id", id);
  return { id: `iss_${id}`, type: input.type, description, email: input.email, status: "open", ticket, createdAt: now };
}
