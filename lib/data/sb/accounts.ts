/**
 * Accounts, projects, follows, profile/contact, self-registration, project team, and the leaderboard.
 * Imports shared internals from ./_core, plus getLocations from ./locations (accounts → locations,
 * one-way). Nothing here imports a higher-level aggregate module.
 */
import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { computeSpeed } from "@/lib/points";
import { CURRENT_MONTH } from "@/lib/format";
import type { Account, MemberBehavior, Project, ProjectTeam, Standing } from "@/types";
import {
  ACCOUNT_COLS, PROJECT_COLS, currentAccountId, toAccount, toProject, withProjectAvatar, meId, _hasContact, APP_URL,
  type ARow,
} from "./_core";
import { pushMessages, statusFlex } from "@/lib/line/push";
import { LIFF } from "@/lib/line/liff";
import { getLocations } from "./locations";

// cache() per-request: the layout and the page both call getMe() — dedupe within the render.
export const getMe = cache(async function getMe(): Promise<Account> {
  const db = supabaseAdmin();
  const id = await currentAccountId();
  if (id) {
    const { data } = await db.from("accounts").select(ACCOUNT_COLS).eq("id", id).maybeSingle();
    if (data) return { ...toAccount(data), isMe: true };
  }
  const { data } = await db.from("accounts").select(ACCOUNT_COLS).order("name").limit(1).maybeSingle();
  return data ? { ...toAccount(data), isMe: true } : { id: "", name: "ผู้เยี่ยมชม", avatarColor: "#1a56db", isMe: true };
});

export async function getAccounts(): Promise<Account[]> {
  const db = supabaseAdmin();
  const me = await meId();
  const { data } = await db.from("accounts").select(ACCOUNT_COLS);
  return (data ?? []).map((r) => toAccount(r, me));
}

export const getProjects = cache(async function getProjects(): Promise<Project[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("projects").select(PROJECT_COLS).order("name");
  return (data ?? []).map(toProject);
});

export async function getProject(id: string): Promise<Project | undefined> {
  const db = supabaseAdmin();
  const { data } = await db.from("projects").select(PROJECT_COLS).eq("id", id).limit(1).single();
  return data ? toProject(data) : undefined;
}

export async function getFollowingIds(): Promise<Set<string>> {
  const db = supabaseAdmin();
  const me = await meId();
  const { data } = await db.from("account_follows").select("following_id").eq("follower_id", me);
  return new Set((data ?? []).map((r) => r.following_id));
}

export interface ActivityItem { when: string; kind: "submit" | "draft" | "edit" | "register"; label: string; sub?: string }

/** The signed-in user's OWN recent activity (submissions, location edits, registrations), newest
 *  first — for the profile timeline. Filters strictly to this account/name (the audit tables are
 *  dominated by pseudo-account sync churn). */
export async function getMyActivity(): Promise<ActivityItem[]> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return [];
  const { data: acct } = await db.from("accounts").select("name").eq("id", me).maybeSingle();
  const myName = (acct?.name ?? "").trim();
  const monthTh = (ym: string) => { const [y, m] = (ym ?? "").split("-"); return y ? `${m}/${Number(y) + 543}` : ym; };

  const [subsRes, regsRes, editsRes] = await Promise.all([
    db.from("location_submissions").select("project_id,location_id,year_month,status,submitted_at,updated_at")
      .eq("account_id", me).order("updated_at", { ascending: false }).limit(40),
    db.from("project_account_registrations").select("project_id,registered_at").eq("account_id", me),
    myName
      ? db.from("location_audit_log").select("action,changed_at,project_id,before_data,after_data")
          .eq("changed_by", myName).order("changed_at", { ascending: false }).limit(40)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);
  const subs = subsRes.data ?? [];
  const regs = regsRes.data ?? [];
  const edits = (editsRes.data ?? []) as Array<{ action: string; changed_at: string; project_id: string; before_data: { tambon?: string } | null; after_data: { tambon?: string } | null }>;

  const projIds = new Set<string>(), locIds = new Set<string>();
  subs.forEach((s) => { projIds.add(s.project_id); locIds.add(s.location_id); });
  regs.forEach((r) => projIds.add(r.project_id));
  edits.forEach((e) => projIds.add(e.project_id));
  const [projRes, locRes] = await Promise.all([
    projIds.size ? db.from("projects").select("id,name").in("id", [...projIds]) : Promise.resolve({ data: [] }),
    locIds.size ? db.from("project_locations").select("id,tambon").in("id", [...locIds]) : Promise.resolve({ data: [] }),
  ]);
  const pName = new Map((projRes.data ?? []).map((p: { id: string; name: string }) => [p.id, p.name]));
  const lName = new Map((locRes.data ?? []).map((l: { id: string; tambon: string }) => [l.id, l.tambon]));

  const items: ActivityItem[] = [];
  for (const s of subs) {
    const submitted = s.status === "submitted";
    items.push({
      when: (submitted ? s.submitted_at : s.updated_at) ?? s.updated_at ?? "",
      kind: submitted ? "submit" : "draft",
      label: `${submitted ? "ส่งข้อมูล" : "บันทึกร่าง"} · ${pName.get(s.project_id) ?? "โครงการ"}`,
      sub: `ต.${lName.get(s.location_id) ?? "—"} · รอบ ${monthTh(s.year_month)}`,
    });
  }
  const EDIT_TH: Record<string, string> = { rename: "แก้ไขพื้นที่", add: "เพิ่มพื้นที่", delete: "ลบพื้นที่", verify: "ยืนยันพื้นที่", unverify_on_unregister: "ยกเลิกยืนยันพื้นที่" };
  for (const e of edits) {
    const tam = e.after_data?.tambon ?? e.before_data?.tambon;
    items.push({
      when: e.changed_at, kind: "edit",
      label: `${EDIT_TH[e.action] ?? e.action} · ${pName.get(e.project_id) ?? "โครงการ"}`,
      sub: tam ? `ต.${tam}` : undefined,
    });
  }
  for (const r of regs) {
    items.push({ when: r.registered_at, kind: "register", label: `ลงทะเบียนโครงการ · ${pName.get(r.project_id) ?? "โครงการ"}` });
  }
  return items.filter((i) => i.when).sort((a, b) => (a.when < b.when ? 1 : -1)).slice(0, 50);
}

/** The signed-in account's contact/profile info (name + phone + org + email), and whether it's
 *  complete enough to enroll (phone on file). */
export async function getMyContact(): Promise<{ name: string; phone: string; org: string; email: string; hasContact: boolean; lineLinked: boolean }> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return { name: "", phone: "", org: "", email: "", hasContact: false, lineLinked: false };
  const { data } = await db.from("accounts").select("name,phone,org,email,line_user_id").eq("id", me).maybeSingle();
  const phone = String(data?.phone ?? "").trim();
  return {
    name: data?.name ?? "", phone: phone === "-" ? "" : phone,
    org: data?.org ?? "", email: data?.email ?? "", hasContact: phone.length > 0,
    lineLinked: !!data?.line_user_id,
  };
}

/** Save the signed-in account's profile (name/phone required for enrolling; org/email optional). */
export async function setMyContact(input: { name: string; phone: string; org?: string; email?: string }): Promise<{ ok: boolean }> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return { ok: false };
  const patch: Record<string, string> = { phone: (input.phone ?? "").trim() };
  if (input.name?.trim()) patch.name = input.name.trim();
  if (input.org !== undefined) patch.org = input.org.trim();
  if (input.email !== undefined) patch.email = input.email.trim();
  const { error } = await db.from("accounts").update(patch).eq("id", me);
  return { ok: !error };
}

/** Purge: the signed-in account unregisters from a project (data kept; hidden for them). */
export async function unregisterForProject(projectId: string): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return { ok: false, error: "no_account" };
  const { error } = await db.rpc("web_unsubscribe", { p_project: projectId, p_account: me });
  return { ok: !error, error: error?.message };
}

/** Project ids the signed-in account is registered for (lightweight — for the /register picker). */
export async function getRegisteredProjectIds(): Promise<Set<string>> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return new Set();
  const { data } = await db.from("project_account_registrations").select("project_id").eq("account_id", me);
  return new Set((data ?? []).map((r) => r.project_id as string));
}

/** Self-enroll the signed-in account in a project — requires contact info on file first.
 *  If the account is LINE-linked, this also creates the bot-side subscription (monitor_contacts)
 *  via web_line_subscribe so the two registration portals stay in sync; non-LINE accounts keep the
 *  web-only path. */
export async function registerForProject(projectId: string): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return { ok: false, error: "no_account" };
  if (!(await _hasContact(db, me))) return { ok: false, error: "no_contact" };
  const [{ data: acct }, { data: proj }] = await Promise.all([
    db.from("accounts").select("line_user_id,name").eq("id", me).maybeSingle(),
    db.from("projects").select("source_project_id").eq("id", projectId).maybeSingle(),
  ]);
  // web → bot mirror (also upserts the web registration); reuses the same RPC as one-tap subscribe.
  if (acct?.line_user_id && proj?.source_project_id) {
    const { error } = await db.rpc("web_line_subscribe", {
      p_pid: proj.source_project_id, p_line_user_id: acct.line_user_id, p_name: acct.name ?? "",
    });
    if (!error) return { ok: true };
  }
  const { error } = await db.from("project_account_registrations").upsert(
    { project_id: projectId, account_id: me, role: "submitter" },
    { onConflict: "project_id,account_id", ignoreDuplicates: true },
  );
  return { ok: !error };
}

// ── หัวหน้าโครงการ (Project Head) ──────────────────────────────────────────────────────────────
type MemberRow = ARow & { source_kind?: string | null; line_user_id?: string | null };

/** The team view for a project: the head (if approved), the human member roster + this month's
 *  per-member submission behavior, and the signed-in user's eligibility to request to become head.
 *  Pseudo 'project' accounts (source_kind='project', carry the project's points) are excluded. */
export async function getProjectTeam(projectId: string): Promise<ProjectTeam> {
  const db = supabaseAdmin();
  const me = await meId();

  const [{ data: proj }, { data: regs }, locs] = await Promise.all([
    db.from("projects").select("head_account_id").eq("id", projectId).maybeSingle(),
    db.from("project_account_registrations").select("account_id").eq("project_id", projectId),
    getLocations(projectId),
  ]);
  const total = locs.length;
  const headId = (proj?.head_account_id as string | null) ?? null;
  const memberIds = (regs ?? []).map((r) => r.account_id as string);

  const { data: accRows } = memberIds.length
    ? await db.from("accounts")
        .select("id,name,org,avatar_color,source_project_id,picture_url,source_kind,line_user_id")
        .in("id", memberIds)
    : { data: [] as MemberRow[] };
  const humans = ((accRows ?? []) as MemberRow[]).filter((a) => a.source_kind !== "project");

  // this month's submissions per member → submitted-location count + last-active timestamp
  const { data: subs } = humans.length
    ? await db.from("location_submissions")
        .select("account_id,location_id,status,submitted_at,updated_at")
        .eq("project_id", projectId).eq("year_month", CURRENT_MONTH)
        .in("account_id", humans.map((a) => a.id))
    : { data: [] as { account_id: string; location_id: string; status: string; submitted_at: string | null; updated_at: string | null }[] };
  const agg = new Map<string, { locs: Set<string>; last?: string }>();
  for (const s of subs ?? []) {
    const m = agg.get(s.account_id) ?? { locs: new Set<string>() };
    if (s.status === "submitted") m.locs.add(s.location_id);
    const ts = s.submitted_at ?? s.updated_at ?? undefined;
    if (ts && (!m.last || ts > m.last)) m.last = ts;
    agg.set(s.account_id, m);
  }

  // head is normally a member; fall back to a direct fetch if it was set then the member unregistered
  let headRow: MemberRow | null = headId ? humans.find((a) => a.id === headId) ?? null : null;
  if (headId && !headRow) {
    const { data: h } = await db.from("accounts")
      .select("id,name,org,avatar_color,source_project_id,picture_url,source_kind,line_user_id")
      .eq("id", headId).maybeSingle();
    headRow = (h as MemberRow) ?? null;
  }

  const members: MemberBehavior[] = humans
    .map((a) => {
      const m = agg.get(a.id);
      return { account: toAccount(a, me), submitted: m ? m.locs.size : 0, total, lastActiveAt: m?.last };
    })
    .sort((x, y) =>
      x.account.id === headId ? -1 : y.account.id === headId ? 1
        : (y.submitted - x.submitted) || x.account.name.localeCompare(y.account.name));

  const meHuman = humans.find((a) => a.id === me);
  let myStatus: ProjectTeam["myStatus"];
  if (headId) myStatus = "has_head";
  else if (!meHuman) myStatus = "not_member";
  else if (!meHuman.line_user_id) myStatus = "not_linked";
  else {
    const { data: pending } = await db.from("project_head_requests")
      .select("id").eq("project_id", projectId).eq("account_id", me).eq("status", "pending").maybeSingle();
    myStatus = pending ? "pending" : "can_request";
  }

  return { head: headRow ? toAccount(headRow, me) : null, members, myStatus, iAmHead: !!headId && headId === me };
}

/** Chief-or-owner gate for the team activity feed: the project head (หัวหน้าโครงการ) OR an
 *  'owner'-role registration may see who-did-what across the whole project. */
export async function canSeeTeamActivity(projectId: string): Promise<boolean> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return false;
  const [{ data: proj }, { data: reg }] = await Promise.all([
    db.from("projects").select("head_account_id").eq("id", projectId).maybeSingle(),
    db.from("project_account_registrations").select("role").eq("project_id", projectId).eq("account_id", me).maybeSingle(),
  ]);
  return proj?.head_account_id === me || reg?.role === "owner";
}

/** Is the signed-in member this project's head (หัวหน้าโครงการ)? */
export async function isProjectHead(projectId: string): Promise<boolean> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return false;
  const { data } = await db.from("projects").select("head_account_id").eq("id", projectId).maybeSingle();
  return !!me && data?.head_account_id === me;
}

export type HeadQuestionnaireRequest = {
  requestId: string; title: string; requesterName: string;
  questionCount: number; scoreCount: number; includeAai: boolean; requestedAt: string;
};
/** Pending questionnaire requests for a project the caller heads (empty if not the head). Drives the
 *  head's approval queue on /integrate. Service-role read (RLS is RPC-only), gated by isProjectHead. */
export async function getHeadQuestionnaireRequests(projectId: string): Promise<HeadQuestionnaireRequest[]> {
  if (!(await isProjectHead(projectId))) return [];
  const db = supabaseAdmin();
  const { data } = await db.from("project_questionnaire_requests")
    .select("id,title,requester_name,include_aai,payload,requested_at")
    .eq("project_id", projectId).eq("status", "pending").order("requested_at", { ascending: true });
  return ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const payload = r.payload as { questions?: unknown[]; scores?: unknown[] } | null;
    return {
      requestId: String(r.id), title: String(r.title ?? ""), requesterName: String(r.requester_name ?? ""),
      questionCount: Array.isArray(payload?.questions) ? payload!.questions!.length : 0,
      scoreCount: Array.isArray(payload?.scores) ? payload!.scores!.length : 0,
      includeAai: r.include_aai === true, requestedAt: String(r.requested_at ?? ""),
    };
  });
}

/** The signed-in member asks to become this project's head → pending admin approval (web_request_head).
 *  Idempotent: an existing pending request returns ok. */
export async function requestToBeHead(projectId: string): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return { ok: false, error: "no_account" };
  const { data, error } = await db.rpc("web_request_head", { p_project: projectId, p_account: me });
  if (error) return { ok: false, error: error.message };
  return data === "ok" || data === "exists" ? { ok: true } : { ok: false, error: String(data) };
}

/** The member asks to enable individual-data integration for this project → pending admin approval. */
export async function requestIntegration(projectId: string, note?: string): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return { ok: false, error: "no_account" };
  const { data, error } = await db.rpc("web_request_integration", { p_project: projectId, p_actor: me, p_note: note ?? null });
  if (error) return { ok: false, error: error.message };
  return data === "ok" || data === "exists" ? { ok: true }
    : data === "already_enabled" ? { ok: true }
      : { ok: false, error: String(data) };
}

/** Whether individual-data integration is enabled for a project, and whether a request is pending. */
export async function getIntegrationStatus(projectId: string): Promise<{ enabled: boolean; pending: boolean }> {
  const db = supabaseAdmin();
  const [{ data: proj }, { data: pend }] = await Promise.all([
    db.from("projects").select("individual_integration_enabled").eq("id", projectId).maybeSingle(),
    db.from("project_integration_requests").select("id").eq("project_id", projectId).eq("status", "pending").maybeSingle(),
  ]);
  return { enabled: proj?.individual_integration_enabled === true, pending: !!pend };
}

/** The member submits a custom questionnaire (JSON) for this project → pending admin approval. */
export async function requestQuestionnaire(
  projectId: string, input: { title: string; includeAai: boolean; payload: unknown; note?: string },
): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return { ok: false, error: "no_account" };
  const { data, error } = await db.rpc("web_request_questionnaire", {
    p_project: projectId, p_title: input.title, p_include_aai: input.includeAai,
    p_payload: input.payload, p_actor: me, p_note: input.note ?? null,
  });
  if (error) return { ok: false, error: error.message };
  if (data !== "ok" && data !== "exists") return { ok: false, error: String(data) };
  // Best-effort: LINE-notify the project head (หัวหน้าโครงการ = the approver) on a genuinely new request.
  if (data === "ok") await notifyHeadOfQuestionnaireRequest(db, projectId, input.title);
  return { ok: true };
}

/** Push a LINE message to the project head about a new questionnaire request. Never throws — a missing
 *  head / unlinked LINE / push failure is a silent no-op (the in-app bell surfaces it regardless). */
async function notifyHeadOfQuestionnaireRequest(db: ReturnType<typeof supabaseAdmin>, projectId: string, title: string) {
  try {
    const { data: proj } = await db.from("projects").select("name,head_account_id").eq("id", projectId).maybeSingle();
    const headId = (proj as { head_account_id?: string | null } | null)?.head_account_id;
    if (!headId) return;
    const { data: head } = await db.from("accounts").select("line_user_id").eq("id", headId).maybeSingle();
    const lineId = (head as { line_user_id?: string | null } | null)?.line_user_id;
    if (!lineId) return;
    const name = String((proj as { name?: string } | null)?.name ?? "");
    await pushMessages(lineId, [statusFlex({
      tone: "warning",
      headline: "📋 มีคำขอเพิ่มแบบสอบถาม",
      title: name,
      rows: [["ชื่อแบบสอบถาม", title || "(ไม่มีชื่อ)"], ["สถานะ", "รอหัวหน้าโครงการอนุมัติ"]],
      button: { label: "ตรวจสอบ / อนุมัติ", uri: LIFF(`/integrate/${projectId}`) },
      altText: `มีคำขอเพิ่มแบบสอบถาม "${title}" ในโครงการ ${name} — ตรวจสอบที่ ${APP_URL}/integrate/${projectId}`,
    })]);
  } catch { /* best-effort */ }
}

/** Whether a questionnaire request is pending admin review for this project. */
export async function getQuestionnaireRequestStatus(projectId: string): Promise<{ pending: boolean }> {
  const db = supabaseAdmin();
  const { data } = await db.from("project_questionnaire_requests")
    .select("id").eq("project_id", projectId).eq("status", "pending").maybeSingle();
  return { pending: !!data };
}

/** Leaderboard via the in-DB compute_standings() RPC + name/flag joins. */
export const getLeaderboard = cache(async function getLeaderboard(month = CURRENT_MONTH): Promise<Standing[]> {
  const db = supabaseAdmin();
  const [{ data: rows }, accts, projs, followed, me] = await Promise.all([
    db.rpc("compute_standings", { p_month: month }),
    getAccounts(), getProjects(), getFollowingIds(), meId(),
  ]);
  const aMap = new Map(accts.map((a) => [a.id, a]));
  const pMap = new Map(projs.map((p) => [p.id, p]));
  return (rows ?? [])
    .filter((r: { account_id: string; project_id: string }) => aMap.has(r.account_id) && pMap.has(r.project_id))
    .map((r: { rank: number; account_id: string; project_id: string; total_points: number; submitted_at: string | null }) => ({
      rank: Number(r.rank),
      account: withProjectAvatar(aMap.get(r.account_id)!, pMap.get(r.project_id)!, aMap),
      project: pMap.get(r.project_id)!,
      totalPoints: r.total_points,
      submittedAt: r.submitted_at ?? undefined,
      submittedDay: r.submitted_at ? Number(r.submitted_at.slice(8, 10)) : undefined,
      isMe: r.account_id === me,
      isFollowed: followed.has(r.account_id),
    }));
});

export async function getSpeedLeaderboard(month = CURRENT_MONTH): Promise<Standing[]> {
  return computeSpeed(await getLeaderboard(month));
}

export async function getHistoryMonths(): Promise<string[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("monthly_rankings").select("year_month");
  return Array.from(new Set((data ?? []).map((r) => r.year_month))).sort().reverse();
}

export async function getMonthlyHistory(month: string): Promise<Standing[]> {
  const db = supabaseAdmin();
  const [{ data: rows }, accts, projs, followed, me] = await Promise.all([
    db.from("monthly_rankings").select("rank,account_id,project_id,total_points,submitted_at").eq("year_month", month).order("rank"),
    getAccounts(), getProjects(), getFollowingIds(), meId(),
  ]);
  const aMap = new Map(accts.map((a) => [a.id, a]));
  const pMap = new Map(projs.map((p) => [p.id, p]));
  return (rows ?? []).filter((r) => aMap.has(r.account_id) && pMap.has(r.project_id)).map((r) => ({
    rank: r.rank, account: withProjectAvatar(aMap.get(r.account_id)!, pMap.get(r.project_id)!, aMap), project: pMap.get(r.project_id)!,
    totalPoints: r.total_points, submittedAt: r.submitted_at ?? undefined,
    isMe: r.account_id === me, isFollowed: followed.has(r.account_id),
  }));
}
