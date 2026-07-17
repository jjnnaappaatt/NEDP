import { NextResponse } from "next/server";
import { getPersonDetail, isProjectContact } from "@/lib/data";

export const dynamic = "force-dynamic";

/** One person's detail (name decrypted + assessment timeline) for the in-tab entry Sheet. Gated by
 *  project membership (the person's project). */
export async function GET(req: Request) {
  const personId = new URL(req.url).searchParams.get("personId") ?? "";
  if (!personId) return NextResponse.json({ person: null }, { status: 400 });
  const person = await getPersonDetail(personId);
  if (!person) return NextResponse.json({ person: null }, { status: 404 });
  if (!(await isProjectContact(person.projectId))) {
    return NextResponse.json({ person: null, error: "not_contact" }, { status: 403 });
  }
  return NextResponse.json({ person });
}
