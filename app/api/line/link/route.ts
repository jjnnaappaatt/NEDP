import { NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PALETTE = ["#1a56db", "#0e9f6e", "#d97706", "#7c3aed", "#db2777", "#0284c7", "#475569", "#b45309"];

/**
 * Links a LINE user to a web account.
 *
 * The browser (LiffProvider) sends the LIFF **access token** — never a raw userId — so a client
 * cannot forge an identity. We:
 *   1. verify the token actually belongs to OUR LINE Login channel (oauth2/v2.1/verify),
 *   2. fetch the authoritative profile from LINE (/v2/profile) to get the real userId,
 *   3. find the account by line_user_id, creating one on first contact, and set an httpOnly
 *      session cookie so server components render as this LINE user.
 */
export async function POST(req: Request) {
  let accessToken = "";
  try {
    const body = await req.json();
    accessToken = String(body?.accessToken ?? "");
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  if (!accessToken) {
    return NextResponse.json({ error: "accessToken required" }, { status: 400 });
  }

  // 1) Token must belong to our LINE Login channel.
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  const verifyRes = await fetch(
    `https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!verifyRes.ok) {
    return NextResponse.json({ error: "invalid LINE token" }, { status: 401 });
  }
  const verify = (await verifyRes.json()) as { client_id?: string };
  if (channelId && verify.client_id !== channelId) {
    return NextResponse.json({ error: "token channel mismatch" }, { status: 401 });
  }

  // 2) Authoritative profile (userId is trustworthy only because the token verified above).
  const profRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profRes.ok) {
    return NextResponse.json({ error: "profile fetch failed" }, { status: 401 });
  }
  const profile = (await profRes.json()) as {
    userId: string;
    displayName: string;
    pictureUrl?: string;
  };
  const lineUserId = profile.userId;

  // 3) Find or create the web account for this LINE user.
  const db = supabaseAdmin();
  let { data: acct } = await db
    .from("accounts")
    .select("id,name,org,avatar_color")
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
      .select("id,name,org,avatar_color")
      .single();
    acct = created ?? null;
  }

  // Two-way registration sync so the bot and the web app agree:
  //  • bot→web (web_sync_line_registrations): bot subscriptions → web registrations
  //  • web→bot (web_sync_registrations_to_line): web registrations → bot monitor_contacts (so the
  //    LINE bot's "จัดการ" + reminders see a user who registered on the web app)
  // Run AFTER the response via next/server `after()` — these only touch the *other* side's tables, so
  // the cookie/identity response need not wait (and it stays reliable on Vercel, unlike fire-and-forget).
  if (acct) {
    const accId = acct.id;
    const pic = profile.pictureUrl ?? null;
    after(async () => {
      await Promise.all([
        // keep the LINE photo fresh on every link (existing accounts too)
        pic ? db.from("accounts").update({ picture_url: pic }).eq("id", accId) : Promise.resolve(),
        db.rpc("web_sync_line_registrations", { p_line_user_id: lineUserId }),
        db.rpc("web_sync_registrations_to_line", { p_line_user_id: lineUserId }),
      ]).catch(() => {});
    });
  }

  const res = NextResponse.json({
    account: acct
      ? { id: acct.id, name: acct.name, org: acct.org, avatarColor: acct.avatar_color }
      : null,
    line: {
      userId: lineUserId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl ?? null,
    },
  });
  if (acct) {
    res.cookies.set("nedp_account", acct.id, {
      httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 180,
    });
  }
  return res;
}
