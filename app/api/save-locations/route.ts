import { NextResponse } from "next/server";
import { saveLocations } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Persist an edited project location list → reconciles the bot's canonical monitor_project_areas. */
export async function POST(req: Request) {
  let body: {
    projectId?: string;
    locations?: { id: string; province: string; amphoe: string; tambon: string }[];
    editedBy?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  if (!body?.projectId || !Array.isArray(body.locations)) {
    return NextResponse.json({ error: "projectId and locations required" }, { status: 400 });
  }
  const r = await saveLocations({ projectId: body.projectId, locations: body.locations, editedBy: body.editedBy });
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
