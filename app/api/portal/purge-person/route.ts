import { NextResponse } from "next/server";
import { purgePerson, isProjectContact } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Permanently delete a person + all their AAI (CASCADE erases assessments + encrypted name). IRREVERSIBLE.
 *  Gated by project membership (the person's project). */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { personId?: string; projectId?: string };
  if (!b.personId || !b.projectId) return NextResponse.json({ ok: false, error: "missing" }, { status: 400 });
  if (!(await isProjectContact(b.projectId))) {
    return NextResponse.json({ ok: false, error: "not_contact" }, { status: 403 });
  }
  return NextResponse.json(await purgePerson(b.personId, b.projectId));
}
