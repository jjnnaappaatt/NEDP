import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ACCOUNT_COOKIE, ACCOUNT_COOKIE_OPTS, signAccountToken } from "@/lib/account-auth";

export const dynamic = "force-dynamic";

const PALETTE = ["#1a56db", "#0e9f6e", "#d97706", "#7c3aed", "#db2777", "#0284c7", "#475569", "#b45309"];

/**
 * True one-tap LINE auto-subscribe (no manual "send" — LINE no longer auto-sends from oaMessage
 * deep links). The LIFF page (`/subscribe`) sends the LIFF **access token** + the project id; we
 *   1. verify the token belongs to OUR LINE Login channel + fetch the real userId,
 *   2. find/create the web account (so the user gets an identity + session cookie),
 *   3. call `web_line_subscribe` which writes the bot's `monitor_contacts` row AND mirrors a
 *      `project_account_registrations` row so the project shows on the web สถานะ page.
 */
export async function POST(req: Request) {
  let accessToken = "";
  let pid = 0;
  let code = "";
  try {
    const body = await req.json();
    accessToken = String(body?.accessToken ?? "");
    pid = Number(body?.pid ?? 0);
    code = String(body?.code ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  }
  if (!accessToken || !pid) {
    return NextResponse.json({ ok: false, error: "accessToken and pid required" }, { status: 400 });
  }

  // 1) Token must belong to our LINE Login channel; userId is trustworthy only after this verify.
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  const verifyRes = await fetch(
    `https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!verifyRes.ok) {
    return NextResponse.json({ ok: false, error: "invalid LINE token" }, { status: 401 });
  }
  const verify = (await verifyRes.json()) as { client_id?: string };
  if (channelId && verify.client_id !== channelId) {
    return NextResponse.json({ ok: false, error: "token channel mismatch" }, { status: 401 });
  }
  const profRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profRes.ok) {
    return NextResponse.json({ ok: false, error: "profile fetch failed" }, { status: 401 });
  }
  const profile = (await profRes.json()) as { userId: string; displayName: string; pictureUrl?: string };
  const lineUserId = profile.userId;

  // 2) Find or create the web account for this LINE user.
  const db = supabaseAdmin();
  let { data: acct } = await db
    .from("accounts")
    .select("id")
    .eq("line_user_id", lineUserId)
    .limit(1)
    .maybeSingle();
  if (!acct) {
    const color = PALETTE[[...lineUserId].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
    const { data: created } = await db
      .from("accounts")
      .insert({
        name: profile.displayName || "ผู้ใช้ LINE",
        line_user_id: lineUserId,
        avatar_color: color,
        source_kind: "line",
        picture_url: profile.pictureUrl ?? null,
      })
      .select("id")
      .single();
    acct = created ?? null;
  } else if (profile.pictureUrl) {
    await db.from("accounts").update({ picture_url: profile.pictureUrl }).eq("id", acct.id);
  }

  // 3) Subscribe (bot contact + web registration mirror), all server-side.
  void code; // carried in the URL for readability; identity is bound by the verified access token.
  const { data, error } = await db.rpc("web_line_subscribe", {
    p_pid: pid,
    p_line_user_id: lineUserId,
    p_name: profile.displayName ?? null,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  const r = (data ?? {}) as { ok?: boolean; project?: string; error?: string };

  const res = NextResponse.json({ ok: r.ok !== false, project: r.project ?? null, error: r.error });
  if (acct) {
    res.cookies.set(ACCOUNT_COOKIE, await signAccountToken(acct.id), ACCOUNT_COOKIE_OPTS);
  }
  return res;
}
