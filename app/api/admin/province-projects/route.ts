import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getProvinceProjectProgress } from "@/lib/data";

/** GET ?province=<province_code> → per-project AAI progress within that province. Admin-only (this route is
 *  under /api/admin/*, which the middleware matcher doesn't cover, so gate it explicitly here). */
export async function GET(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const province = new URL(req.url).searchParams.get("province") ?? "";
  if (!province) return NextResponse.json({ rows: [] });
  const rows = await getProvinceProjectProgress(province);
  return NextResponse.json({ rows });
}
