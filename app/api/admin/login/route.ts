import { NextResponse } from "next/server";
import { signAdminToken, timingSafeEqualStr, ADMIN_COOKIE, ADMIN_TTL_SECONDS } from "@/lib/admin-auth";

/** POST { password } → set the signed admin cookie on a correct shared password (env ADMIN_PORTAL_PASSWORD). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = String((body as { password?: unknown }).password ?? "");
  const expected = process.env.ADMIN_PORTAL_PASSWORD ?? "";
  if (!expected || !timingSafeEqualStr(password, expected)) {
    return NextResponse.json({ ok: false, error: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }
  const token = await signAdminToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: ADMIN_TTL_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
