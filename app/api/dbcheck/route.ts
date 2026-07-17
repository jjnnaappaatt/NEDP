import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { denyInProd } from "@/lib/devGuard";

/** Dev check: confirm seeded counts + that issue reports persisted. */
export async function GET() {
  const denied = denyInProd();
  if (denied) return denied;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const db = createClient(url, key, { auth: { persistSession: false } });
  const count = async (t: string) => (await db.from(t).select("*", { count: "exact", head: true })).count ?? 0;
  const { data: issues } = await db.from("issue_reports").select("ticket,type").order("created_at", { ascending: false }).limit(3);
  return NextResponse.json({
    projects: await count("projects"),
    point_events: await count("point_events"),
    issue_reports: await count("issue_reports"),
    latestIssues: issues,
  });
}
