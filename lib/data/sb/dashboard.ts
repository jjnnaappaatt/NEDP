/**
 * Cross-cutting aggregates + notification feeds — compose accounts/locations/admin data into the
 * personal dashboard, org-wide (exec) rollups, and the user/admin notification bells. Depends on
 * ./accounts, ./locations, ./admin (and ./_core); nothing lower-level imports this module (one-way).
 */
import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CURRENT_MONTH, TODAY } from "@/lib/format";
import type { DashboardSummary, MyProjectStatus, Project } from "@/types";
import { meId } from "./_core";
import { getLeaderboard, getProjects, getFollowingIds } from "./accounts";
import { getLocationStatuses } from "./locations";
import { getAdminIssues, getEditRequests, getHeadRequests, getQuestionnaireRequests } from "./admin";
import { getAaiSnapshotSummary, type AaiSnapshotRow } from "./aai";

// cache() per-request: the dashboard's KPI + projects sections AND getDashboardSummary all call this
// with the same month — dedupe the standings/location-status fan-out to a single compute per render.
export const getMyProjects = cache(async function getMyProjects(month = CURRENT_MONTH): Promise<MyProjectStatus[]> {
  const db = supabaseAdmin();
  const me = await meId();
  // Batch + parallel (was a per-project waterfall): one projects fetch, then all location
  // statuses concurrently — wall-clock ≈ a single round-trip instead of 2×N sequential ones.
  const [{ data: regs }, standings, projects] = await Promise.all([
    db.from("project_account_registrations").select("project_id").eq("account_id", me),
    getLeaderboard(month),
    getProjects(),
  ]);
  const pMap = new Map(projects.map((p) => [p.id, p]));
  const myRegs = (regs ?? []).filter((r) => pMap.has(r.project_id));
  const statuses = await Promise.all(myRegs.map((r) => getLocationStatuses(r.project_id, month)));
  return myRegs.map((r, i) => {
    const project = pMap.get(r.project_id)!;
    const locs = statuses[i];
    const locationsDone = locs.filter((l) => l.submitted).length;
    const locationsTotal = locs.length;
    const status = locationsTotal > 0 && locationsDone === locationsTotal ? "submitted"
      : locationsDone > 0 ? "draft" : "not_started";
    const points = standings.find((st) => st.project.id === r.project_id && st.isMe)?.totalPoints;
    return { project, status, points, locationsDone, locationsTotal };
  });
});

export type NotificationItem = {
  id: string;
  type: "deadline" | "incomplete" | "edit_pending" | "head_pending" | "questionnaire_pending" | "issue_resolved" | "issue_open";
  projectId: string;
  projectName: string;
  message: string;
  severity: "high" | "info";
  href: string;
};

/** Bell feed for the signed-in user: per registered project — submission deadline + unfinished work this
 *  month — plus the user's own pending edit-requests / head-requests (informational; admin approves). */
export async function getNotifications(): Promise<NotificationItem[]> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return [];
  const month = CURRENT_MONTH;
  const [mine, projects, editReqs, headReqs, resolvedIssues] = await Promise.all([
    getMyProjects(month),
    getProjects(),
    db.from("location_submissions").select("project_id")
      .eq("account_id", me).not("edit_requested_at", "is", null).is("edit_approved_at", null),
    db.from("project_head_requests").select("project_id").eq("account_id", me).eq("status", "pending"),
    db.from("monitor_issues").select("id,ticket").eq("reporter_account_id", me).eq("status", "resolved")
      .gte("resolved_at", new Date(Date.now() - 14 * 86_400_000).toISOString()),
  ]);
  const nameOf = new Map(projects.map((p) => [p.id, p.name]));
  const items: NotificationItem[] = [];

  for (const m of mine) {
    const days = m.project.deadlineDay - TODAY.day;
    if (days < 0) {
      items.push({ id: `dl-${m.project.id}`, type: "deadline", projectId: m.project.id, projectName: m.project.name,
        message: `เลยกำหนดส่ง ${-days} วัน`, severity: "high", href: `/submit/${m.project.id}` });
    } else if (days <= 3) {
      items.push({ id: `dl-${m.project.id}`, type: "deadline", projectId: m.project.id, projectName: m.project.name,
        message: `ใกล้ถึงกำหนดส่ง · เหลือ ${days} วัน`, severity: "high", href: `/submit/${m.project.id}` });
    }
    if (m.status !== "submitted") {
      items.push({ id: `inc-${m.project.id}`, type: "incomplete", projectId: m.project.id, projectName: m.project.name,
        message: m.locationsTotal > 0 ? `ส่งแล้ว ${m.locationsDone}/${m.locationsTotal} พื้นที่` : "ยังไม่ได้ส่งข้อมูลเดือนนี้",
        severity: m.project.deadlineDay - TODAY.day < 0 ? "high" : "info", href: `/submit/${m.project.id}` });
    }
  }
  const editByProj = new Map<string, number>();
  for (const r of (editReqs.data ?? []) as { project_id: string }[]) editByProj.set(r.project_id, (editByProj.get(r.project_id) ?? 0) + 1);
  for (const [pid, n] of editByProj) {
    items.push({ id: `edit-${pid}`, type: "edit_pending", projectId: pid, projectName: nameOf.get(pid) ?? "โครงการ",
      message: `คำขอแก้ไข ${n} รายการ · รออนุมัติจากผู้ดูแล`, severity: "info", href: `/status/${pid}` });
  }
  for (const r of (headReqs.data ?? []) as { project_id: string }[]) {
    items.push({ id: `head-${r.project_id}`, type: "head_pending", projectId: r.project_id, projectName: nameOf.get(r.project_id) ?? "โครงการ",
      message: "คำขอเป็นหัวหน้าโครงการ · รออนุมัติ", severity: "info", href: `/status/${r.project_id}` });
  }
  // As the project head (หัวหน้าโครงการ), pending questionnaire requests awaiting MY approval.
  const headProjectIds = projects.filter((p) => p.headAccountId === me).map((p) => p.id);
  if (headProjectIds.length) {
    const { data: qReqs } = await db.from("project_questionnaire_requests")
      .select("project_id").in("project_id", headProjectIds).eq("status", "pending");
    const qByProj = new Map<string, number>();
    for (const r of (qReqs ?? []) as { project_id: string }[]) qByProj.set(r.project_id, (qByProj.get(r.project_id) ?? 0) + 1);
    for (const [pid, n] of qByProj) {
      items.push({ id: `qn-${pid}`, type: "questionnaire_pending", projectId: pid, projectName: nameOf.get(pid) ?? "โครงการ",
        message: `คำขอเพิ่มแบบสอบถาม ${n} รายการ · รออนุมัติ`, severity: "high", href: `/integrate/${pid}` });
    }
  }
  for (const r of (resolvedIssues.data ?? []) as { id: number; ticket: string | null }[]) {
    items.push({ id: `iss-${r.id}`, type: "issue_resolved", projectId: "", projectName: "",
      message: `เรื่องที่คุณแจ้ง${r.ticket ? ` (${r.ticket})` : ""} ได้รับการแก้ไขแล้ว`, severity: "info", href: "/help" });
  }
  items.sort((a, b) => (a.severity === "high" ? 0 : 1) - (b.severity === "high" ? 0 : 1));
  return items;
}

/** Admin bell feed: a digest of work needing an admin's action — open issues, pending edit / head-of-project
 *  requests, and projects overdue this month. Category summaries (empty projectName; message is the line). */
export async function getAdminNotifications(): Promise<NotificationItem[]> {
  const [issues, edits, heads, statuses, qReqs] = await Promise.all([
    getAdminIssues(), getEditRequests(), getHeadRequests(), getAllProjectStatuses(CURRENT_MONTH), getQuestionnaireRequests(),
  ]);
  const openIssues = issues.filter((i) => i.status === "open").length;
  const overdue = statuses.filter((p) => p.status !== "submitted" && p.project.deadlineDay - TODAY.day < 0).length;
  const items: NotificationItem[] = [];
  const push = (id: string, type: NotificationItem["type"], message: string, severity: NotificationItem["severity"], href: string) =>
    items.push({ id, type, projectId: "", projectName: "", message, severity, href });
  if (openIssues) push("adm-issues", "issue_open", `เรื่องแจ้งปัญหาที่ยังไม่แก้ ${openIssues} รายการ`, "high", "/admin/issues");
  if (edits.length) push("adm-edits", "edit_pending", `คำขอแก้ไขข้อมูล ${edits.length} รายการ รออนุมัติ`, "high", "/admin/issues");
  if (heads.length) push("adm-heads", "head_pending", `คำขอเป็นหัวหน้าโครงการ ${heads.length} รายการ รออนุมัติ`, "high", "/admin/projects");
  if (qReqs.length) push("adm-questionnaires", "questionnaire_pending", `คำขอเพิ่มแบบสอบถาม ${qReqs.length} รายการ รออนุมัติ`, "high", "/admin/projects");
  if (overdue) push("adm-overdue", "deadline", `${overdue} โครงการเลยกำหนดส่งเดือนนี้`, "high", "/admin/status");
  items.sort((a, b) => (a.severity === "high" ? 0 : 1) - (b.severity === "high" ? 0 : 1));
  return items;
}

export async function getDashboardSummary(month = CURRENT_MONTH): Promise<DashboardSummary> {
  const db = supabaseAdmin();
  const [standings, mine, followed, { count: projectCount }, { count: totalAccounts }, { count: submittedThisMonth }] =
    await Promise.all([
      getLeaderboard(month), getMyProjects(month), getFollowingIds(),
      db.from("projects").select("*", { count: "exact", head: true }),
      db.from("accounts").select("*", { count: "exact", head: true }).not("line_user_id", "is", null), // real (LINE-linked) users — not seeded placeholders
      db.from("location_submissions").select("*", { count: "exact", head: true }).eq("year_month", month).eq("status", "submitted"),
    ]);
  const mineStandings = standings.filter((s) => s.isMe);
  const mineBest = [...mineStandings].sort((a, b) => a.rank - b.rank)[0];
  const upcoming = mine.map((m) => ({ project: m.project, days: m.project.deadlineDay - TODAY.day }))
    .filter((d) => d.days >= 0).sort((a, b) => a.days - b.days)[0];
  const feed = standings.filter((s) => followed.has(s.account.id)).slice(0, 5)
    .map((s) => ({ account: s.account, project: s.project, points: s.totalPoints, submittedAt: s.submittedAt }));
  return {
    projectCount: projectCount ?? 0, submittedThisMonth: submittedThisMonth ?? 0, totalAccounts: totalAccounts ?? 0,
    myRank: mineBest?.rank, myPoints: mineStandings.reduce((s, x) => s + x.totalPoints, 0),
    nextDeadlineDays: upcoming?.days ?? 0, nextDeadlineProject: upcoming?.project, feed,
  };
}

// ── Executive (org-wide) aggregates — NOT me-scoped — for the public /exec dashboard ──────────────

export type OrgProjectStatus = {
  project: Project;
  locationsDone: number;
  locationsTotal: number;
  status: "submitted" | "draft" | "not_started";
};

/** Every project's location completion for the month (cf. getMyProjects, but org-wide). */
export async function getAllProjectStatuses(month = CURRENT_MONTH): Promise<OrgProjectStatus[]> {
  const projects = await getProjects();
  const statuses = await Promise.all(projects.map((p) => getLocationStatuses(p.id, month)));
  return projects
    .map((project, i) => {
      const locs = statuses[i];
      const locationsDone = locs.filter((l) => l.submitted).length;
      const locationsTotal = locs.length;
      const status: OrgProjectStatus["status"] =
        locationsTotal > 0 && locationsDone === locationsTotal ? "submitted" : locationsDone > 0 ? "draft" : "not_started";
      return { project, locationsDone, locationsTotal, status };
    })
    .sort((a, b) => {
      const pa = a.locationsTotal ? a.locationsDone / a.locationsTotal : 0;
      const pb = b.locationsTotal ? b.locationsDone / b.locationsTotal : 0;
      return pb - pa;
    });
}

export type OrgSummary = {
  projectCount: number;
  submittedProjects: number;
  totalAccounts: number;
  submittedLocations: number;
  avgCompletionPct: number;
};

/** Org-wide KPIs for the exec dashboard (counts + average completion across all projects). */
export async function getOrgDashboardSummary(month = CURRENT_MONTH): Promise<OrgSummary> {
  const db = supabaseAdmin();
  const [all, { count: totalAccounts }, { count: submittedLocations }] = await Promise.all([
    getAllProjectStatuses(month),
    db.from("accounts").select("*", { count: "exact", head: true }).not("line_user_id", "is", null), // real (LINE-linked) users — not seeded placeholders
    db.from("location_submissions").select("*", { count: "exact", head: true }).eq("year_month", month).eq("status", "submitted"),
  ]);
  const projectCount = all.length;
  const submittedProjects = all.filter((p) => p.status === "submitted").length;
  const avgCompletionPct = projectCount === 0 ? 0
    : Math.round((all.reduce((s, p) => s + (p.locationsTotal ? p.locationsDone / p.locationsTotal : 0), 0) / projectCount) * 100);
  return { projectCount, submittedProjects, totalAccounts: totalAccounts ?? 0, submittedLocations: submittedLocations ?? 0, avgCompletionPct };
}

export type AdminProjectSummary = {
  projectId: string;
  projectName: string;
  researcher: string;
  completionPct: number;
  locationsDone: number;
  locationsTotal: number;
  nElderly: number;
  overall: number | null;
  d1: number | null; d2: number | null; d3: number | null; d4: number | null;
};

/** Admin aggregate rollup — ONE ROW PER PROJECT: submission progress + the project-level LATEST Overall +
 *  D1–D4 (weighted by #elderly across the project's provinces; suppressed <5-person cells drop out of the
 *  weighting). NO per-person data, no raw answers, no indicators. Powers the admin-only aggregate export.
 *  Composes getAllProjectStatuses + per-project aai_rollup_snapshots (admin surface = low traffic). */
export async function getAdminProjectSummaries(month = CURRENT_MONTH): Promise<AdminProjectSummary[]> {
  const statuses = await getAllProjectStatuses(month);
  return Promise.all(
    statuses.map(async ({ project, locationsDone, locationsTotal }) => {
      const rows = await getAaiSnapshotSummary({ level: "province", projectIds: [project.id], latestMonth: month });
      const wavg = (pick: (r: AaiSnapshotRow) => number | null): number | null => {
        let w = 0, acc = 0;
        for (const r of rows) {
          const v = pick(r);
          if (v != null && r.nElderly > 0) { w += r.nElderly; acc += v * r.nElderly; }
        }
        return w > 0 ? Math.round((acc / w) * 10) / 10 : null;
      };
      return {
        projectId: project.id, projectName: project.name,
        researcher: project.researcher || project.org || "",
        completionPct: locationsTotal ? Math.round((locationsDone / locationsTotal) * 100) : 0,
        locationsDone, locationsTotal,
        nElderly: rows.reduce((s, r) => s + r.nElderly, 0),
        overall: wavg((r) => r.overall.latest),
        d1: wavg((r) => r.d1.latest), d2: wavg((r) => r.d2.latest),
        d3: wavg((r) => r.d3.latest), d4: wavg((r) => r.d4.latest),
      };
    }),
  );
}
