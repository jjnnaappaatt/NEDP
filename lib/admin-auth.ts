/**
 * Admin-portal session: one shared admin password (env `ADMIN_PORTAL_PASSWORD`) → an HMAC-signed,
 * time-bounded cookie. LINE-independent (mirrors aai_mvp's monitor_admin pattern), distinct from the
 * per-LINE-user `nedp_account` cookie. Uses Web Crypto only (no next/headers at module top) so this
 * file is safe to import from BOTH edge middleware and Node route handlers/server components.
 */

export const ADMIN_COOKIE = "nedp_admin";
export const ADMIN_TTL_SECONDS = 60 * 60 * 12; // 12h, matches the Railway monitor session
const TTL_MS = ADMIN_TTL_SECONDS * 1000;

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

async function hmac(payloadB64: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64));
  return b64urlFromBytes(new Uint8Array(sig));
}

/** Constant-time string compare (avoid early-exit timing leak on the password / signature). */
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Mint a fresh admin session token (call only after the password check passes). */
export async function signAdminToken(): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  const payloadB64 = b64urlFromString(JSON.stringify({ iat: Date.now() }));
  const sig = await hmac(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

/** Verify a token's signature + TTL. Pure (no cookie access) so middleware can call it on the edge. */
export async function verifyAdminToken(token?: string | null): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(payloadB64, secret);
  if (!timingSafeEqualStr(sig, expected)) return false;
  try {
    const iat = Number(JSON.parse(stringFromB64url(payloadB64)).iat);
    return Number.isFinite(iat) && Date.now() - iat <= TTL_MS;
  } catch {
    return false;
  }
}

/** Server-component helper: is the current request an authenticated admin? (dynamic-imports next/headers
 *  so the module stays edge-safe for middleware). */
export async function getAdminSession(): Promise<boolean> {
  const { cookies } = await import("next/headers");
  const c = await cookies();
  return verifyAdminToken(c.get(ADMIN_COOKIE)?.value);
}
