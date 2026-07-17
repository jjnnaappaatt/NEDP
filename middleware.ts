import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/admin-auth";

/**
 * Two jobs, both edge-cheap:
 *  1. Gate the in-app admin portal: every `/admin/*` route except the login page requires a valid signed
 *     admin cookie, otherwise redirect to `/admin/login`. The login API lives under `/api/admin/*` (not in
 *     the matcher), so it stays reachable. `verifyAdminToken` is Web-Crypto-only.
 *  2. Expose the request pathname to server components via an `x-pathname` header, so AppShell can skip the
 *     identity fetch (getMe → Supabase) on the bare routes (`/manual`, `/admin`) that never use it — which
 *     keeps the PUBLIC `/manual` guide free of any Supabase dependency.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  const pass = () => NextResponse.next({ request: { headers: requestHeaders } });

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const ok = await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }
  return pass();
}

// Only the exact `/manual` page needs x-pathname (to skip getMe); `/manual/:path*` is deliberately
// omitted so middleware never runs on the guide's static assets (og.png, QR, screenshots).
export const config = { matcher: ["/admin", "/admin/:path*", "/manual"] };
