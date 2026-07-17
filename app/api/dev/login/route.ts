import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { denyInProd } from "@/lib/devGuard";
import { ACCOUNT_COOKIE, ACCOUNT_COOKIE_OPTS, signAccountToken } from "@/lib/account-auth";

/**
 * Dev-only login for local E2E: GET /api/dev/login?name=<exact account name>[&head=<projectUuid>]
 * (or ?accountId=<uuid>). Sets the same `nedp_account` session cookie as /api/line/link, ensures the
 * account has a phone (so isProjectContact() passes), and can optionally make it the project head so
 * the chief-only activity feed is testable without the admin console. NEVER runs in production.
 */
export async function GET(req: Request) {
  const denied = denyInProd();
  if (denied) return denied;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase env not set" }, { status: 500 });
  const db = createClient(url, key, { auth: { persistSession: false } });

  const params = new URL(req.url).searchParams;
  const name = params.get("name");
  const accountId = params.get("accountId");
  const head = params.get("head");
  if (!name && !accountId) return NextResponse.json({ error: "pass ?name= or ?accountId=" }, { status: 400 });

  let q = db.from("accounts").select("id,name,phone").limit(1);
  q = accountId ? q.eq("id", accountId) : q.eq("name", name!);
  const { data: acct, error } = await q.maybeSingle();
  if (error || !acct) return NextResponse.json({ error: error?.message ?? "account not found" }, { status: 404 });

  // isProjectContact requires a phone on file — give the dev account one if missing.
  if (!acct.phone) await db.from("accounts").update({ phone: "0800000000" }).eq("id", acct.id);
  // Optional: promote to project head (chief) for the activity-feed test path.
  if (head) await db.from("projects").update({ head_account_id: acct.id }).eq("id", head);

  const res = NextResponse.json({ ok: true, accountId: acct.id, name: acct.name, head: head ?? null });
  res.cookies.set(ACCOUNT_COOKIE, await signAccountToken(acct.id), ACCOUNT_COOKIE_OPTS);
  return res;
}
