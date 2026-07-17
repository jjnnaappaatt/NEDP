import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { sendProjectReminder, sendReminderToPending } from "@/lib/data";

/** POST { type: 'submit'|'location', projectId?, all? } → push LINE reminders. Admin-gated.
 *  Single project (projectId) or bulk to all pending (all=true). */
export async function POST(req: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { type?: string; projectId?: string; all?: boolean };
  const type = b.type === "location" ? "location" : b.type === "submit" ? "submit" : null;
  if (!type) return NextResponse.json({ ok: false, error: "type required" }, { status: 400 });

  if (b.all) {
    const r = await sendReminderToPending(type);
    return NextResponse.json({ ok: true, ...r, projects: r.results.length });
  }
  if (!b.projectId) return NextResponse.json({ ok: false, error: "projectId or all required" }, { status: 400 });
  const r = await sendProjectReminder(b.projectId, type);
  return NextResponse.json(r, { status: r.ok || r.sent > 0 ? 200 : 400 });
}
