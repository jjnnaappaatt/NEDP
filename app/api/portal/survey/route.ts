import { NextResponse } from "next/server";
import { getProjectSurveyDashboard, isProjectContact } from "@/lib/data";
import { getAdminSession } from "@/lib/admin-auth";
import { resolveToRealProject } from "@/lib/specialProjects";

export const dynamic = "force-dynamic";

/** The project's own questionnaire (survey) dashboard, for the combined "Dashboard" tab's on-demand
 *  project switch. A SMART bundle id resolves to its primary member (full-copy data). Gated: the caller
 *  must be a contact of the (resolved) project — or admin. */
export async function GET(req: Request) {
  const projectId = resolveToRealProject(new URL(req.url).searchParams.get("projectId") ?? "");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const [contact, admin] = await Promise.all([isProjectContact(projectId), getAdminSession()]);
  if (!contact && !admin) return NextResponse.json({ error: "not_contact" }, { status: 403 });
  return NextResponse.json(await getProjectSurveyDashboard(projectId));
}
