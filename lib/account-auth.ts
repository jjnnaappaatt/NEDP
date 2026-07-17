/**
 * Per-LINE-user account session: the account id carried in an HMAC-signed, time-bounded token
 * (mirrors lib/admin-auth.ts). This REPLACES the previously-unsigned `nedp_account` cookie, which
 * stored the plaintext account UUID — anyone who learned a UUID (they leak via the public /leaderboard)
 * could impersonate that account by sending `Cookie: nedp_account=<uuid>`. Web Crypto only, so this is
 * safe to import from edge middleware and Node handlers alike.
 *
 * The HMAC input is domain-separated with an "acct." prefix, so an account token can never be replayed
 * as a valid admin token (lib/admin-auth.ts signs the bare payload) even if both share one secret.
 */
import { timingSafeEqualStr } from "./admin-auth";

export const ACCOUNT_COOKIE = "nedp_account";
export const ACCOUNT_TTL_SECONDS = 60 * 60 * 24 * 180; // 180 days (matches the previous cookie maxAge)
const TTL_MS = ACCOUNT_TTL_SECONDS * 1000;

/** Cookie attributes for the account session (adds `secure` in production vs the old options). */
export const ACCOUNT_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: ACCOUNT_TTL_SECONDS,
  secure: process.env.NODE_ENV === "production",
};

const enc = new TextEncoder();

function b64urlFromBytes(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlFromString(str: string): string {
  return b64urlFromBytes(enc.encode(str));
}
function stringFromB64url(b64: string): string {
  const s = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
async function sign(payloadB64: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  // Domain-separated: "acct." prefix keeps account tokens distinct from admin tokens.
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`acct.${payloadB64}`));
  return b64urlFromBytes(new Uint8Array(sig));
}

/** ACCOUNT_SESSION_SECRET, falling back to ADMIN_SESSION_SECRET (domain separation keeps this safe). */
function secret(): string | null {
  return process.env.ACCOUNT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || null;
}

/** Mint a signed session token for an account id. Throws if no secret is configured. */
export async function signAccountToken(accountId: string): Promise<string> {
  const s = secret();
  if (!s) throw new Error("ACCOUNT_SESSION_SECRET (or ADMIN_SESSION_SECRET) is not set");
  const payloadB64 = b64urlFromString(JSON.stringify({ a: accountId, iat: Date.now() }));
  const sig = await sign(payloadB64, s);
  return `${payloadB64}.${sig}`;
}

/** Verify a token's signature + TTL and return its account id, or null. Pure (no cookie access). */
export async function verifyAccountToken(token?: string | null): Promise<string | null> {
  if (!token) return null;
  const s = secret();
  if (!s) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);
  const expected = await sign(payloadB64, s);
  if (!timingSafeEqualStr(providedSig, expected)) return null;
  try {
    const payload = JSON.parse(stringFromB64url(payloadB64)) as { a?: unknown; iat?: unknown };
    const iat = Number(payload.iat);
    if (!Number.isFinite(iat) || Date.now() - iat > TTL_MS) return null;
    return typeof payload.a === "string" && payload.a ? payload.a : null;
  } catch {
    return null;
  }
}
