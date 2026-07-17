import { NextResponse } from "next/server";

/**
 * Dev-only API routes (seed / standings / dbcheck) must NEVER run on a public deploy —
 * `/api/seed` in particular wipes and reseeds the whole database. `process.env.VERCEL`
 * is "1" on every Vercel environment (production + preview), so this returns a 404 there
 * (not revealing the route exists) and `null` only on a local machine.
 *
 * Usage at the top of each dev route handler:
 *   const denied = denyOnVercel();
 *   if (denied) return denied;
 */
export function denyOnVercel(): NextResponse | null {
  if (process.env.VERCEL) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}
