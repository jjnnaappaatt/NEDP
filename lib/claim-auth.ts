/**
 * Admin-issued "claim link" token: an HMAC-signed, time-bounded token that authorizes binding a LINE
 * identity to a specific placeholder account (mirrors lib/account-auth.ts / lib/admin-auth.ts). The admin
 * mints one per project's placeholder account; the researcher opens the link, logs in with LINE, and the
 * server binds their verified LINE userId to that account. The token carries ONLY the target account id —
 * the LINE identity comes from the verified access token, never the URL — so a leaked link can at worst
 * bind the opener's own LINE account to the invited placeholder (which is the intended action).
 *
 * Domain-separated with a "claim." prefix so a claim token can never be replayed as an account or admin
 * session token even when they share one secret. Web Crypto only → safe in edge + Node handlers.
 */
import { timingSafeEqualStr } from "./admin-auth";

export const CLAIM_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days
const TTL_MS = CLAIM_TTL_SECONDS * 1000;

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
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`claim.${payloadB64}`));
  return b64urlFromBytes(new Uint8Array(sig));
}

/** ACCOUNT_SESSION_SECRET, falling back to ADMIN_SESSION_SECRET (domain separation keeps this safe). */
function secret(): string | null {
  return process.env.ACCOUNT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || null;
}

/** Mint a signed claim token for a placeholder account id. Throws if no secret is configured. */
export async function signClaimToken(accountId: string): Promise<string> {
  const s = secret();
  if (!s) throw new Error("ACCOUNT_SESSION_SECRET (or ADMIN_SESSION_SECRET) is not set");
  const payloadB64 = b64urlFromString(JSON.stringify({ a: accountId, iat: Date.now() }));
  const sig = await sign(payloadB64, s);
  return `${payloadB64}.${sig}`;
}

/** Verify a claim token's signature + TTL and return the target account id, or null. */
export async function verifyClaimToken(token?: string | null): Promise<string | null> {
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
