/** Mock data implementation (sync). Selected by lib/data when NEXT_PUBLIC_DATA_SOURCE !== 'supabase'. */
import {
  ME_ID, accounts, projects, registrations, submissions, monthlyRankings, follows,
  locations, locationSubmissions, locationVerifications, templateFor,
} from "@/lib/mock/data";
import { computeStandings, computeSpeed } from "@/lib/points";
import { CURRENT_MONTH, TODAY } from "@/lib/format";
import type {
  Account, DashboardSummary, IssueReport, LocationAuditEntry, LocationStatus, LocationVerification,
  MyProjectStatus, Project, ProjectLocation, ProjectTemplate, Standing,
} from "@/types";

export function getMe(): Account {
  return accounts.find((a) => a.id === ME_ID)!;
}
export function getAccounts(): Account[] {
  return accounts;
}
export function getProjects(): Project[] {
  return projects;
}
export function getProject(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}
export function getFollowingIds(followerId = ME_ID): Set<string> {
  return new Set(follows.filter((f) => f.followerId === followerId).map((f) => f.followingId));
}
export function getTemplate(projectId: string): ProjectTemplate {
  return templateFor(projectId);
}
export function getLocations(projectId: string): ProjectLocation[] {
  return locations.filter((l) => l.projectId === projectId);
}
export function getLocationStatuses(projectId: string, month = CURRENT_MONTH, accountId = ME_ID): LocationStatus[] {
  return getLocations(projectId).map((location) => {
    const sub = locationSubmissions.find(
      (s) => s.locationId === location.id && s.accountId === accountId && s.yearMonth === month && s.status === "submitted",
    );
    return { location, submitted: !!sub, submittedAt: sub?.submittedAt };
  });
}
export function getLocationVerification(projectId: string): LocationVerification | null {
  return locationVerifications.find((v) => v.projectId === projectId) ?? null;
}
export function getMyProjects(month = CURRENT_MONTH): MyProjectStatus[] {
  const mine = registrations.filter((r) => r.accountId === ME_ID).map((r) => r.projectId);
  const standings = getLeaderboard(month);
  return mine.map((pid) => {
    const project = getProject(pid)!;
    const locs = getLocationStatuses(pid, month);
    const locationsDone = locs.filter((l) => l.submitted).length;
    const locationsTotal = locs.length;
    const status: MyProjectStatus["status"] =
      locationsTotal > 0 && locationsDone === locationsTotal ? "submitted" : locationsDone > 0 ? "draft" : "not_started";
    const submission = submissions.find((s) => s.projectId === pid && s.accountId === ME_ID && s.yearMonth === month);
    const points = standings.find((st) => st.project.id === pid && st.isMe)?.totalPoints;
    return { project, submission, status, points, locationsDone, locationsTotal };
  });
}
export function getLeaderboard(month = CURRENT_MONTH): Standing[] {
  return computeStandings(submissions, projects, accounts, getFollowingIds(), ME_ID, month);
}
export function getSpeedLeaderboard(month = CURRENT_MONTH): Standing[] {
  return computeSpeed(getLeaderboard(month));
}
export function getHistoryMonths(): string[] {
  return Array.from(new Set(monthlyRankings.map((r) => r.yearMonth))).sort().reverse();
}
export function getMonthlyHistory(month: string): Standing[] {
  const followed = getFollowingIds();
  return monthlyRankings.filter((r) => r.yearMonth === month).sort((a, b) => a.rank - b.rank).map((r) => ({
    rank: r.rank, account: accounts.find((a) => a.id === r.accountId)!, project: getProject(r.projectId)!,
    totalPoints: r.totalPoints, submittedAt: r.submittedAt, isMe: r.accountId === ME_ID, isFollowed: followed.has(r.accountId),
  }));
}
export function getDashboardSummary(month = CURRENT_MONTH): DashboardSummary {
  const standings = getLeaderboard(month);
  const mine = getMyProjects(month);
  const mineBest = standings.filter((s) => s.isMe).sort((a, b) => a.rank - b.rank)[0];
  const myPoints = standings.filter((s) => s.isMe).reduce((s, x) => s + x.totalPoints, 0);
  const upcoming = mine.map((m) => ({ project: m.project, days: m.project.deadlineDay - TODAY.day }))
    .filter((d) => d.days >= 0).sort((a, b) => a.days - b.days)[0];
  const followed = getFollowingIds();
  const feed = standings.filter((s) => followed.has(s.account.id)).slice(0, 5)
    .map((s) => ({ account: s.account, project: s.project, points: s.totalPoints, submittedAt: s.submittedAt }));
  return {
    projectCount: projects.length,
    submittedThisMonth: submissions.filter((s) => s.yearMonth === month && s.status === "submitted").length,
    totalAccounts: accounts.length, myRank: mineBest?.rank, myPoints,
    nextDeadlineDays: upcoming?.days ?? 0, nextDeadlineProject: upcoming?.project, feed,
  };
}
export function submitIssue(input: { type: string; description: string; email?: string }): IssueReport {
  const n = Math.floor((input.description.length * 7 + input.type.length * 13 + 1000) % 9000) + 1000;
  return {
    id: `iss_${n}`, type: input.type, description: input.description, email: input.email,
    status: "open", ticket: `NEDP-${n}`, createdAt: `${CURRENT_MONTH}-${String(TODAY.day).padStart(2, "0")}T12:00:00+07:00`,
  };
}
export function submitLocation(
  _input: { projectId: string; locationId: string; values: Record<string, string> },
): { ok: boolean } {
  return { ok: true };
}
export function bulkSubmitLocations(
  input: { projectId: string; rows: { locationId: string; values: Record<string, string> }[] },
): { ok: boolean; saved: number } {
  return { ok: true, saved: input.rows?.length ?? 0 };
}
export function isProjectContact(_projectId: string): boolean {
  return true;
}
export function getMyContact(): { name: string; phone: string; hasContact: boolean } {
  return { name: "ผู้ใช้สาธิต", phone: "0800000000", hasContact: true };
}
export function setMyContact(_input: { name: string; phone: string }): { ok: boolean } {
  return { ok: true };
}
export function getRegisteredProjectIds(): Set<string> {
  return new Set(registrations.filter((r) => r.accountId === ME_ID).map((r) => r.projectId));
}
export function registerForProject(_projectId: string): { ok: boolean } {
  return { ok: true };
}
export function verifyLocations(_input: { projectId: string; verifiedBy: string }): { ok: boolean } {
  return { ok: true };
}
export function saveLocations(
  _input: {
    projectId: string;
    locations: { id: string; province: string; amphoe: string; tambon: string }[];
    editedBy?: string;
  },
): { ok: boolean; blocked?: string[] } {
  return { ok: true };
}
export function getLocationAudit(_projectId: string): LocationAuditEntry[] {
  return [];
}
