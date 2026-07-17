import { NextResponse } from "next/server";
import { getTambonPersonDetail, isProjectContact } from "@/lib/data";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** One person's read-only AAI timeline (no name) for the dashboard drill. Authorized for the admin session OR
 *  a contact of the person's project. */
export async function GET(req: Request) {
  const personId = new URL(req.url).searchParams.get("personId") ?? "";
  if (!personId) return NextResponse.json({ person: null }, { status: 400 });
  const person = await getTambonPersonDetail(personId);
  if (!person) return NextResponse.json({ person: null }, { status: 404 });
  if (!(await getAdminSession()) && !(await isProjectContact(person.projectId))) {
    return NextResponse.json({ person: null, error: "not_authorized" }, { status: 403 });
  }
  return NextResponse.json({ person });
}
