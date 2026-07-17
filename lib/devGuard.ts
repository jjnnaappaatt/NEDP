import { NextResponse } from "next/server";

/**
 * Dev-only API routes (seed / standings / dbcheck / dev-login) must NEVER run on a public deploy —
 * `/api/seed` in particular wipes and reseeds the whole database, and `/api/dev/login` mints a session
 * for any account with no password.
 *
 * Deny-by-DEFAULT: these routes are allowed ONLY in a genuine dev environment. The previous guard keyed
 * on `process.env.VERCEL`, which fails OPEN on any non-Vercel host (Railway / Docker / self-host) — a
 * forker who deploys elsewhere would expose the DB wipe + passwordless login in production. We now deny
 * whenever the build is production (`NODE_ENV === "production"`, set by `next build`/`next start` and by
 * every Vercel runtime) regardless of host, returning 404 (not revealing the route exists). Only a local
 * `next dev` (NODE_ENV !== "production") is allowed through.
 *
 * Usage at the top of each dev route handler:
 *   const denied = denyInProd();
 *   if (denied) return denied;
 */
export function denyInProd(): NextResponse | null {
  const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
  if (isProd) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}
