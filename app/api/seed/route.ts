import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  accounts, projects, locations, registrations, submissions, locationSubmissions,
  locationVerifications, monthlyRankings, follows, templateFor, ME_ID,
} from "@/lib/mock/data";
import { pointEventsForSubmission } from "@/lib/points";
import { denyInProd } from "@/lib/devGuard";

/**
 * Dev-only seed: populate Supabase from the Phase-1 mock (lib/mock). Mock string ids ("p1","a1")
 * are mapped to uuids; point_events are derived with the real engine so compute_standings() in the
 * DB reproduces the leaderboard. Idempotent: deletes all rows first. Trigger: GET /api/seed?confirm=1
 */
export async function GET(req: Request) {
  const denied = denyInProd();
  if (denied) return denied;
  if (new URL(req.url).searchParams.get("confirm") !== "1") {
    return NextResponse.json({ error: "add ?confirm=1 to seed" }, { status: 400 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase env not set" }, { status: 500 });

  const db = createClient(url, key, { auth: { persistSession: false } });

  // mock id -> uuid
  const ids = new Map<string, string>();
  const uid = (k: string) => { if (!ids.has(k)) ids.set(k, crypto.randomUUID()); return ids.get(k)!; };

  // clear (reverse FK order); broad filters since Supabase requires a filter on delete
  const wipe = async (table: string, col = "id") => { await db.from(table).delete().not(col, "is", null); };
  for (const t of ["submission_audit_log", "location_submissions", "point_events", "monthly_rankings", "project_templates", "issue_reports"]) await wipe(t);
  await db.from("location_verifications").delete().not("project_id", "is", null);
  await db.from("account_follows").delete().not("follower_id", "is", null);
  await db.from("project_account_registrations").delete().not("id", "is", null);
  await db.from("project_locations").delete().not("id", "is", null);
  await db.from("projects").delete().not("id", "is", null);
  await db.from("accounts").delete().not("id", "is", null);

  const errs: string[] = [];
  const ins = async (table: string, rows: Record<string, unknown>[]) => {
    if (!rows.length) return 0;
    const { error } = await db.from(table).insert(rows);
    if (error) errs.push(`${table}: ${error.message}`);
    return error ? 0 : rows.length;
  };

  const counts: Record<string, number> = {};
  counts.accounts = await ins("accounts", accounts.map((a) => ({
    id: uid(a.id), name: a.name, org: a.org, avatar_color: a.avatarColor,
    phone: "0800000000", // dev-only seed: isProjectContact() requires a phone on file
  })));
  counts.projects = await ins("projects", projects.map((p) => ({
    id: uid(p.id), name: p.name, org: p.org, researcher: p.researcher, deadline_day: p.deadlineDay, accent: p.accent, active: true,
  })));
  counts.project_locations = await ins("project_locations", locations.map((l, i) => ({
    id: uid(l.id), project_id: uid(l.projectId), province: l.province, amphoe: l.amphoe, tambon: l.tambon, seq: i,
  })));
  counts.registrations = await ins("project_account_registrations", registrations.map((r) => ({
    id: uid(r.id), project_id: uid(r.projectId), account_id: uid(r.accountId), role: r.role, registered_at: r.registeredAt,
  })));
  counts.location_submissions = await ins("location_submissions", locationSubmissions.map((s) => ({
    id: crypto.randomUUID(), project_id: uid(s.projectId), location_id: uid(s.locationId), account_id: uid(s.accountId),
    year_month: s.yearMonth, status: s.status, completion_pct: s.status === "submitted" ? 100 : 40, submitted_at: s.submittedAt ?? null,
  })));
  counts.location_verifications = await ins("location_verifications", locationVerifications.map((v) => ({
    project_id: uid(v.projectId), verified_by: uid(ME_ID), verified_by_name: v.verifiedBy, verified_at: v.verifiedAt,
  })));

  // point_events derived from project-level submissions via the engine
  const pe = submissions.flatMap((s) => {
    const p = projects.find((x) => x.id === s.projectId);
    return p ? pointEventsForSubmission(s, p).map((e) => ({
      id: crypto.randomUUID(), account_id: uid(e.accountId), project_id: uid(e.projectId),
      year_month: e.yearMonth, event_type: e.type, points: e.points, created_at: e.createdAt || s.submittedAt,
    })) : [];
  });
  counts.point_events = await ins("point_events", pe);

  counts.monthly_rankings = await ins("monthly_rankings", monthlyRankings.map((m) => ({
    id: crypto.randomUUID(), year_month: m.yearMonth, rank: m.rank, account_id: uid(m.accountId),
    project_id: uid(m.projectId), total_points: m.totalPoints, submitted_at: m.submittedAt ?? null,
  })));
  counts.account_follows = await ins("account_follows", follows.map((f) => ({
    follower_id: uid(f.followerId), following_id: uid(f.followingId),
  })));
  counts.project_templates = await ins("project_templates", projects.map((p) => {
    const t = templateFor(p.id);
    return { project_id: uid(p.id), sections: t.sections, fields: t.fields };
  }));

  return NextResponse.json({ ok: errs.length === 0, counts, errors: errs });
}
