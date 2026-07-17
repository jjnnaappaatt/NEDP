import { NextResponse } from "next/server";
import { saveDraftLocation } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Persists one location's monthly data as a DRAFT (editable, status 'draft'). */
export async function POST(req: Request) {
  let body: { projectId?: string; locationId?: string; values?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const { projectId, locationId, values } = body ?? {};
  if (!projectId || !locationId) {
    return NextResponse.json({ error: "projectId and locationId required" }, { status: 400 });
  }
  const r = await saveDraftLocation({ projectId, locationId, values: values ?? {} });
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
