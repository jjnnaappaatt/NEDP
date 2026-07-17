import { NextResponse } from "next/server";
import { upsertOsmCount, getOsmCount, isProjectContact } from "@/lib/data";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** Current อสม. counts for a tambon (for the form's initial values). Gated like the other portal
 *  reads — the POST was already contact-gated, but the GET was unauthenticated (AUDIT.md → osm-count). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") ?? "";
  const tambonCode = url.searchParams.get("tambonCode") ?? "";
  if (!projectId || !tambonCode) return NextResponse.json({ osm: null }, { status: 400 });
  if (!(await getAdminSession()) && !(await isProjectContact(projectId))) {
    return NextResponse.json({ osm: null, error: "not_authorized" }, { status: 403 });
  }
  const osm = await getOsmCount(projectId, tambonCode);
  return NextResponse.json({ osm });
}

/** Upsert the manual อสม. count for a tambon×month. Gated in the data layer. */
export async function POST(req: Request) {
  let body: Parameters<typeof upsertOsmCount>[0];
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  }
  if (!body?.projectId || !body?.tambonCode) {
    return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
  }
  const r = await upsertOsmCount(body);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
