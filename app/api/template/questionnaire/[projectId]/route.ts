import { getProject, getLocations, getAssignedQuestionnaire, isIntegrationEnabled, isProjectContact } from "@/lib/data";
import { getAdminSession } from "@/lib/admin-auth";
import { buildQuestionnaireWorkbook } from "@/lib/server/xlsx";
import { schemaToColumns } from "@/lib/questionnaire/columns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Download the per-project questionnaire template (.xlsx) — columns = the assigned schema (identity +
 *  selected modules' questions). Admin or that project's contact, gated on integration-enabled + an
 *  assigned questionnaire. */
export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const admin = await getAdminSession();
  if (!admin && !(await isProjectContact(projectId))) return new Response("forbidden", { status: 403 });
  if (!(await isIntegrationEnabled(projectId))) return new Response("integration not enabled", { status: 403 });
  const [project, locations, assigned] = await Promise.all([
    getProject(projectId), getLocations(projectId), getAssignedQuestionnaire(projectId),
  ]);
  if (!project) return new Response("not found", { status: 404 });
  if (!assigned) return new Response("no questionnaire assigned", { status: 400 });
  const cols = schemaToColumns(assigned.schema, assigned.modules);
  const buf = await buildQuestionnaireWorkbook(project.name, cols, locations);
  const filename = encodeURIComponent(`แบบสอบถาม-${project.name}.xlsx`);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "Cache-Control": "no-store",
    },
  });
}
