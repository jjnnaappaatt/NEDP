import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ACCOUNT_COOKIE, ACCOUNT_COOKIE_OPTS, signAccountToken } from "@/lib/account-auth";
import { verifyClaimToken } from "@/lib/claim-auth";

export const dynamic = "force-dynamic";

/**
 * Consume an admin-issued claim link: bind the opener's verified LINE identity to the placeholder
 * account named in the (signed) claim token. The LIFF page (`/claim`) sends the LIFF **access token** +
 * the claim `token`; we
 *   1. verify the claim token → the target placeholder account id (admin authorized THIS account),
 *   2. verify the access token belongs to OUR LINE Login channel + fetch the real userId,
 *   3. call web_claim_project_account which binds the LINE identity onto the placeholder (folding in any
 *      duplicate line account the researcher already made), and set the session cookie for the survivor.
 */
export async function POST(req: Request) {
  let accessToken = "";
  let token = "";
  try {
    const body = await req.json();
    accessToken = String(body?.accessToken ?? "");
    token = String(body?.token ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  }
  if (!accessToken || !token) {
    return NextResponse.json({ ok: false, error: "accessToken and token required" }, { status: 400 });
  }

  // 1) Claim token → the placeholder account the admin authorized (signed + TTL-bounded).
  const accountId = await verifyClaimToken(token);
  if (!accountId) {
    return NextResponse.json({ ok: false, error: "ลิงก์เชื่อมบัญชีไม่ถูกต้องหรือหมดอายุ" }, { status: 401 });
  }

  // 2) Access token must belong to our LINE Login channel; userId is trustworthy only after this verify.
  // Fail CLOSED: a claim binds a LINE identity to a specific account, so a missing channel config is a
  // hard error — never a skipped check that would accept a token minted for a different LINE channel.
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!channelId) {
    return NextResponse.json({ ok: false, error: "LINE channel not configured" }, { status: 500 });
  }
  const verifyRes = await fetch(
    `https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!verifyRes.ok) {
    return NextResponse.json({ ok: false, error: "invalid LINE token" }, { status: 401 });
  }
  const verify = (await verifyRes.json()) as { client_id?: string };
  if (verify.client_id !== channelId) {
    return NextResponse.json({ ok: false, error: "token channel mismatch" }, { status: 401 });
  }
  const profRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profRes.ok) {
    return NextResponse.json({ ok: false, error: "profile fetch failed" }, { status: 401 });
  }
  const profile = (await profRes.json()) as { userId: string; displayName: string; pictureUrl?: string };

  // 3) Bind the LINE identity to the placeholder (merging any duplicate line account), server-side.
  const db = supabaseAdmin();
  const { data, error } = await db.rpc("web_claim_project_account", {
    p_account: accountId,
    p_line_user_id: profile.userId,
    p_picture: profile.pictureUrl ?? null,
    p_actor: null,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  const r = (data ?? {}) as { ok?: boolean; account_id?: string; merged?: boolean; error?: string };
  if (!r.ok || !r.account_id) {
    return NextResponse.json({ ok: false, error: r.error ?? "เชื่อมบัญชีไม่สำเร็จ" }, { status: 400 });
  }

  // Session cookie for the SURVIVING account so the researcher lands logged in as their project account.
  const { data: acct } = await db.from("accounts").select("name").eq("id", r.account_id).maybeSingle();
  const res = NextResponse.json({
    ok: true,
    name: (acct as { name?: string } | null)?.name ?? profile.displayName,
    merged: !!r.merged,
  });
  let signErr = false;
  try {
    res.cookies.set(ACCOUNT_COOKIE, await signAccountToken(r.account_id), ACCOUNT_COOKIE_OPTS);
  } catch (e) {
    console.error("[claim] failed to sign account session cookie", e);
    signErr = true;
  }
  if (signErr) {
    return NextResponse.json({ ok: false, error: "session secret not configured" }, { status: 500 });
  }
  return res;
}
