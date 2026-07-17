import { NextResponse } from "next/server";
import { getAssignedQuestionnaire, getPersonPrefill, isProjectContact } from "@/lib/data";

export const dynamic = "force-dynamic";

/** The assigned questionnaire (schema + modules) + this person's prefill — for inlining the clinical
 *  questionnaire form inside the person sheet. Gated by project membership. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") ?? "";
  const personId = url.searchParams.get("personId") ?? "";
  if (!projectId || !personId) return NextResponse.json({ error: "params" }, { status: 400 });
  if (!(await isProjectContact(projectId))) return NextResponse.json({ error: "not_contact" }, { status: 403 });
  const [assigned, prefill] = await Promise.all([getAssignedQuestionnaire(projectId), getPersonPrefill(personId, projectId)]);
  return NextResponse.json({ assigned, prefill });
}
