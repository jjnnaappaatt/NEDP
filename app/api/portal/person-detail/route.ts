import { NextResponse } from "next/server";
import { getPersonDetail, getPersonProjectId, isProjectContact } from "@/lib/data";

export const dynamic = "force-dynamic";

/** One person's detail (name decrypted + assessment timeline) for the in-tab entry Sheet. Gated by
 *  project membership (the person's project). Authorization runs BEFORE the name is decrypted/logged
 *  (a cheap project-id lookup first), so enumerating personIds can't force a PII decrypt + a NULL-actor
 *  audit row on people the caller can't access. See AUDIT.md → MED-3. */
export async function GET(req: Request) {
  const personId = new URL(req.url).searchParams.get("personId") ?? "";
  if (!personId) return NextResponse.json({ person: null }, { status: 400 });
  const projectId = await getPersonProjectId(personId);
  if (!projectId) return NextResponse.json({ person: null }, { status: 404 });
  if (!(await isProjectContact(projectId))) {
    return NextResponse.json({ person: null, error: "not_contact" }, { status: 403 });
  }
  const person = await getPersonDetail(personId);
  if (!person) return NextResponse.json({ person: null }, { status: 404 });
  return NextResponse.json({ person });
}
