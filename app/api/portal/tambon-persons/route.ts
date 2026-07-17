import { NextResponse } from "next/server";
import { getTambonPersons, isProjectContact } from "@/lib/data";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** People in a tambon (across the given projects), searchable by รหัสผู้เข้าร่วม (person_code) — no name.
 *  Authorized for the admin session OR the project contacts (requested projects are intersected with the
 *  viewer's authorized ones). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tambonCode = url.searchParams.get("tambonCode") ?? "";
  const query = url.searchParams.get("q") ?? "";
  const requested = (url.searchParams.get("projects") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!tambonCode || !requested.length) return NextResponse.json({ people: [] });

  let allowed = requested;
  if (!(await getAdminSession())) {
    const checks = await Promise.all(requested.map(async (id) => ((await isProjectContact(id)) ? id : null)));
    allowed = checks.filter((x): x is string => x != null);
  }
  if (!allowed.length) return NextResponse.json({ people: [], error: "not_authorized" }, { status: 403 });
  return NextResponse.json({ people: await getTambonPersons(tambonCode, allowed, query) });
}
