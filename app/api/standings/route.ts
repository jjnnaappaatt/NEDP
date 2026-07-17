import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { denyOnVercel } from "@/lib/devGuard";

/** Proof the seeded DB reproduces the leaderboard: calls compute_standings() + joins names. */
export async function GET() {
  const denied = denyOnVercel();
  if (denied) return denied;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "env not set" }, { status: 500 });
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: rows, error } = await db.rpc("compute_standings", { p_month: "2026-06" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: accts } = await db.from("accounts").select("id,name");
  const { data: projs } = await db.from("projects").select("id,name");
  const aName = new Map((accts ?? []).map((a) => [a.id, a.name]));
  const pName = new Map((projs ?? []).map((p) => [p.id, p.name]));

  const standings = (rows ?? []).map((r: { rank: number; account_id: string; project_id: string; total_points: number }) => ({
    rank: Number(r.rank), account: aName.get(r.account_id), project: pName.get(r.project_id), points: r.total_points,
  }));
  return NextResponse.json({ month: "2026-06", count: standings.length, top5: standings.slice(0, 5) });
}
