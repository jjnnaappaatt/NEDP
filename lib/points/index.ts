/**
 * Point engine — spec §2.1. Pure functions; used now over mock submissions, later over a
 * Supabase point_events table / RPC. Points are per account × project × month.
 *
 *   ส่งก่อน deadline (ภายใน 3 วันแรก)  +50   (early)
 *   ส่งตรงเวลา (ก่อน deadline)         +30   (ontime)
 *   ส่งครบ 100% ของ fields            +20   (complete)
 *   ส่งช้า (หลัง deadline)            +10   (late)
 *   แก้ไขหลังส่ง                      −5/ครั้ง (edit_penalty)
 */
import type { Account, PointEvent, Project, Standing, Submission } from "@/types";

export const POINTS = { early: 50, ontime: 30, complete: 20, late: 10, edit_penalty: -5 } as const;

export const POINT_LABEL: Record<string, string> = {
  early: "ส่งก่อนกำหนด (ภายใน 3 วันแรก)",
  ontime: "ส่งตรงเวลา",
  complete: "กรอกครบ 100%",
  late: "ส่งช้า",
  edit_penalty: "แก้ไขหลังส่ง",
};

/** Derive the point events a single submission earns. */
export function pointEventsForSubmission(sub: Submission, project: Project): PointEvent[] {
  if (sub.status !== "submitted" && sub.status !== "approved") return [];
  const events: PointEvent[] = [];
  const at = sub.submittedAt ?? "";
  const push = (type: PointEvent["type"], points: number) =>
    events.push({
      id: `${sub.id}:${type}`,
      accountId: sub.accountId,
      projectId: sub.projectId,
      yearMonth: sub.yearMonth,
      type,
      points,
      createdAt: at,
    });

  const day = sub.submittedDay ?? 99;
  if (day <= 3) push("early", POINTS.early);
  else if (day <= project.deadlineDay) push("ontime", POINTS.ontime);
  else push("late", POINTS.late);

  if (sub.completionPct >= 100) push("complete", POINTS.complete);
  for (let i = 0; i < (sub.edits ?? 0); i++) push("edit_penalty", POINTS.edit_penalty);
  return events;
}

export function totalPoints(events: PointEvent[]): number {
  return events.reduce((s, e) => s + e.points, 0);
}

/**
 * Rank the month's submissions (per account×project) by points desc, then earliest submit.
 * Seeded "me" + followed flags drive the leaderboard highlights.
 */
export function computeStandings(
  submissions: Submission[],
  projects: Project[],
  accounts: Account[],
  followingIds: Set<string>,
  meId: string,
  yearMonth: string,
): Standing[] {
  const pmap = new Map(projects.map((p) => [p.id, p]));
  const amap = new Map(accounts.map((a) => [a.id, a]));

  const rows = submissions
    .filter((s) => s.yearMonth === yearMonth && (s.status === "submitted" || s.status === "approved"))
    .map((s) => {
      const project = pmap.get(s.projectId)!;
      const account = amap.get(s.accountId)!;
      const pts = totalPoints(pointEventsForSubmission(s, project));
      return { s, project, account, pts };
    })
    .filter((r) => r.project && r.account);

  rows.sort((a, b) => b.pts - a.pts || (a.s.submittedAt ?? "").localeCompare(b.s.submittedAt ?? ""));

  return rows.map((r, i) => ({
    rank: i + 1,
    account: r.account,
    project: r.project,
    totalPoints: r.pts,
    submittedAt: r.s.submittedAt,
    submittedDay: r.s.submittedDay,
    isMe: r.account.id === meId,
    isFollowed: followingIds.has(r.account.id),
  }));
}

/** Speed leaderboard — earliest submitters first (spec §2.3 "who is fastest"). */
export function computeSpeed(standings: Standing[]): Standing[] {
  return [...standings]
    .filter((s) => s.submittedAt)
    .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""))
    .map((s, i) => ({ ...s, rank: i + 1 }));
}
