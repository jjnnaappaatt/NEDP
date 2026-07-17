import "server-only";
import crypto from "node:crypto";

/**
 * LINE Messaging API sender (ported from aai_mvp/app/notify.py) — Vercel now pushes reminders / site-visit
 * invites / approve-notices directly. Needs `LINE_CHANNEL_ACCESS_TOKEN` in the Vercel env; every function is
 * a no-op-with-error when it's unset (so the UI can say "ยังไม่ได้ตั้งค่า LINE token" instead of throwing).
 */
const PUSH_URL = "https://api.line.me/v2/bot/message/push";
const REPLY_URL = "https://api.line.me/v2/bot/message/reply";

export type LineSend = { ok: boolean; status: number; messageId?: string; error?: string };

export function lineConfigured(): boolean {
  return !!process.env.LINE_CHANNEL_ACCESS_TOKEN;
}

/** Verify the X-Line-Signature (HMAC-SHA256 base64 of the raw body with LINE_CHANNEL_SECRET). No secret
 *  set → returns true (dev mode, matching aai_mvp). */
export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // fail-CLOSED in prod; dev-mode only off-prod
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false; // length mismatch
  }
}

async function linePost(url: string, body: Record<string, unknown>): Promise<LineSend> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { ok: false, status: 0, error: "line_token_not_set" };
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, status: 0, error: `network: ${(e as Error).message}` };
  }
  const requestId = res.headers.get("x-line-request-id") ?? undefined;
  if (res.ok) {
    // The real per-message id is in the body (sentMessages[].id); fall back to the request-trace id.
    let messageId = requestId;
    try {
      const j = (await res.json()) as { sentMessages?: { id?: string }[] };
      messageId = j?.sentMessages?.[0]?.id ?? requestId;
    } catch {
      /* keep the request-trace id */
    }
    return { ok: true, status: res.status, messageId };
  }
  let error = `line_${res.status}`;
  try {
    const j = (await res.json()) as { message?: string };
    if (j?.message) error = `${error}: ${j.message}`;
  } catch {
    /* keep the status-only error */
  }
  return { ok: false, status: res.status, error };
}

/** Read-only health check: verify the access token is valid (returns the bot/OA display name). Sends
 *  no message — safe to call anytime to confirm the LINE connection. */
export async function getBotInfo(): Promise<{ ok: boolean; name?: string; error?: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { ok: false, error: "line_token_not_set" };
  try {
    const res = await fetch("https://api.line.me/v2/bot/info", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const j = (await res.json()) as { displayName?: string };
      return { ok: true, name: j.displayName };
    }
    return { ok: false, error: `line_${res.status}` };
  } catch (e) {
    return { ok: false, error: `network: ${(e as Error).message}` };
  }
}

/** Read-only: fetch a LINE user's public display name (used to attribute a bot-reported issue to ผู้แจ้ง
 *  when the reporter isn't a registered contact). Best-effort — returns ok:false if unset/unavailable. */
export async function getProfile(userId: string): Promise<{ ok: boolean; name?: string; error?: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { ok: false, error: "line_token_not_set" };
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const j = (await res.json()) as { displayName?: string };
      return { ok: true, name: j.displayName };
    }
    return { ok: false, error: `line_${res.status}` };
  } catch (e) {
    return { ok: false, error: `network: ${(e as Error).message}` };
  }
}

/** Push a plain-text message to one LINE user/group. */
export function pushText(to: string, text: string): Promise<LineSend> {
  return linePost(PUSH_URL, { to, messages: [{ type: "text", text }] });
}

/** Push already-built message objects (text/flex) to one LINE user/group. */
export function pushMessages(to: string, messages: unknown[]): Promise<LineSend> {
  return linePost(PUSH_URL, { to, messages });
}

/** Reply to a webhook event (free, used by the Wave 4 webhook). */
export function replyMessages(replyToken: string, messages: unknown[]): Promise<LineSend> {
  return linePost(REPLY_URL, { replyToken, messages });
}

/** A BIG, tappable "คู่มือ" card: a `giga` Flex bubble that's just a full-width hero image whose whole area
 *  opens `linkUrl` (a plain LINE image message can't be tapped, and a landscape image renders small). A square
 *  image fills the chat vertically, Seagull-style. */
export function manualHeroCard(imgUrl: string, linkUrl: string, altText = "คู่มือการใช้งาน NEDP — แตะเพื่อเปิดอ่าน"): Record<string, unknown> {
  return {
    type: "flex",
    altText,
    contents: {
      type: "bubble",
      size: "giga",
      hero: {
        type: "image", url: imgUrl, size: "full", aspectRatio: "1:1", aspectMode: "cover",
        action: { type: "uri", uri: linkUrl },
      },
    },
  };
}

const TONE_COLOR = { success: "#16a34a", warning: "#d97706", danger: "#dc2626" } as const;

/** Compact status/notification Flex bubble (approve / reject / reminder / resolved) — color-coded
 *  header + info rows + one optional LIFF deep-link button. `altText` MUST carry the full plain-text
 *  message so notification previews and degraded clients lose nothing vs the old text pushes. */
export function statusFlex(v: {
  tone: keyof typeof TONE_COLOR;
  headline: string;                          // header line, e.g. "✅ อนุมัติคำขอแก้ไขข้อมูลแล้ว"
  title?: string;                            // bold body line (usually the project name)
  rows?: [label: string, value: string][];   // info rows (label left, value right)
  button?: { label: string; uri: string };   // single deep-link button, colored by tone
  altText: string;
}): Record<string, unknown> {
  const row = (label: string, value: string) => ({
    type: "box", layout: "baseline", spacing: "sm",
    contents: [
      { type: "text", text: label, color: "#8a8a8a", size: "sm", flex: 2 },
      { type: "text", text: value || "—", wrap: true, color: "#333333", size: "sm", flex: 5 },
    ],
  });
  const bodyContents: Record<string, unknown>[] = [];
  if (v.title) bodyContents.push({ type: "text", text: v.title, weight: "bold", size: "md", wrap: true });
  if (v.rows?.length) {
    bodyContents.push({
      type: "box", layout: "vertical", spacing: "sm", margin: v.title ? "md" : "none",
      contents: v.rows.map(([l, val]) => row(l, val)),
    });
  }
  return {
    type: "flex",
    altText: v.altText,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box", layout: "vertical", backgroundColor: TONE_COLOR[v.tone], paddingAll: "14px",
        contents: [{ type: "text", text: v.headline, color: "#ffffff", weight: "bold", size: "sm", wrap: true }],
      },
      ...(bodyContents.length
        ? { body: { type: "box", layout: "vertical", spacing: "md", contents: bodyContents } }
        : {}),
      ...(v.button
        ? {
            footer: {
              type: "box", layout: "vertical",
              contents: [{
                type: "button", style: "primary", color: TONE_COLOR[v.tone], height: "sm",
                action: { type: "uri", label: v.button.label, uri: v.button.uri },
              }],
            },
          }
        : {}),
    },
  };
}

/** ลงพื้นที่ (site-visit) invite Flex bubble with two RSVP postback buttons. The postback data
 *  `rsvp:{id}:{yes|no}` is handled by the LINE webhook → written to monitor_site_visit_rsvps. */
export function visitInviteFlex(v: {
  id: number; title: string; hostProvince: string; venue: string; when: string; details: string;
  imageUrl?: string | null;
}): Record<string, unknown> {
  const row = (label: string, value: string) => ({
    type: "box", layout: "baseline", spacing: "sm",
    contents: [
      { type: "text", text: label, color: "#8a8a8a", size: "sm", flex: 2 },
      { type: "text", text: value || "—", wrap: true, color: "#333333", size: "sm", flex: 5 },
    ],
  });
  // Optional attached image → Flex hero (LINE fetches the public URL). Omitted when there's no image.
  const hero = v.imageUrl
    ? { hero: { type: "image", url: v.imageUrl, size: "full", aspectRatio: "20:13", aspectMode: "cover" } }
    : {};
  return {
    type: "flex",
    altText: `เชิญร่วมลงพื้นที่: ${v.title}`,
    contents: {
      type: "bubble",
      ...hero,
      header: {
        type: "box", layout: "vertical", backgroundColor: "#d97706", paddingAll: "16px",
        contents: [
          { type: "text", text: "📍 เชิญร่วมลงพื้นที่ตรวจเยี่ยม", color: "#ffffff", weight: "bold", size: "md", wrap: true },
        ],
      },
      body: {
        type: "box", layout: "vertical", spacing: "md",
        contents: [
          { type: "text", text: v.title, weight: "bold", size: "lg", wrap: true },
          { type: "box", layout: "vertical", spacing: "sm", margin: "md", contents: [
            row("จังหวัด", v.hostProvince), row("วันเวลา", v.when), row("สถานที่", v.venue),
            ...(v.details ? [row("รายละเอียด", v.details)] : []),
          ] },
        ],
      },
      footer: {
        type: "box", layout: "horizontal", spacing: "sm",
        contents: [
          { type: "button", style: "primary", color: "#16a34a", height: "sm",
            action: { type: "postback", label: "✅ จะเข้าร่วม", data: `rsvp:${v.id}:yes`, displayText: "จะเข้าร่วม" } },
          { type: "button", style: "secondary", height: "sm",
            action: { type: "postback", label: "❌ ไม่สะดวก", data: `rsvp:${v.id}:no`, displayText: "ไม่สะดวก" } },
        ],
      },
    },
  };
}
