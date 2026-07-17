import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createSiteVisit, cancelSiteVisit, sendSiteVisit, getVisitRsvps } from "@/lib/data";

/** GET ?rsvps=<visitId> → the RSVP list for a visit. Admin-gated. */
export async function GET(req: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = Number(new URL(req.url).searchParams.get("rsvps"));
  if (!id) return NextResponse.json({ rsvps: [] });
  return NextResponse.json({ rsvps: await getVisitRsvps(id) });
}

/** POST { action: 'create'|'cancel'|'send', ... }. Admin-gated. */
export async function POST(req: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as {
    action?: string; id?: number;
    title?: string; hostProvince?: string; targetProvinces?: string[]; venue?: string; when?: string; details?: string;
    imageUrl?: string;
  };
  if (b.action === "create") {
    if (!b.title?.trim()) return NextResponse.json({ ok: false, error: "title required" }, { status: 400 });
    const r = await createSiteVisit({
      title: b.title.trim(), hostProvince: b.hostProvince ?? "", targetProvinces: b.targetProvinces ?? [],
      venue: b.venue ?? "", when: b.when ?? "", details: b.details ?? "", imageUrl: b.imageUrl ?? null,
    });
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
  }
  if (b.action === "cancel") {
    if (!b.id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    return NextResponse.json(await cancelSiteVisit(b.id));
  }
  if (b.action === "send") {
    if (!b.id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    const r = await sendSiteVisit(b.id);
    return NextResponse.json(r, { status: r.ok || r.sent > 0 ? 200 : 400 });
  }
  return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
}
