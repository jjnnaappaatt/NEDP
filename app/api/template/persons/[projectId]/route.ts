import { getProject, getLocations, isIntegrationEnabled, isProjectContact } from "@/lib/data";
import { getAdminSession } from "@/lib/admin-auth";
import { buildPersonsWorkbook } from "@/lib/server/xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Download the per-person questionnaire intake template (.xlsx) — one row per elderly person, Thai
 *  headers + a "คำอธิบาย" data-dictionary sheet. Admin or that project's contact, and only when the
 *  project's individual-data integration is enabled (request→approve gate). */
export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const admin = await getAdminSession();
  if (!admin && !(await isProjectContact(projectId))) return new Response("forbidden", { status: 403 });
  if (!(await isIntegrationEnabled(projectId))) return new Response("integration not enabled", { status: 403 });
  const [project, locations] = await Promise.all([getProject(projectId), getLocations(projectId)]);
  if (!project) return new Response("not found", { status: 404 });
  const buf = await buildPersonsWorkbook(project.name, locations);
  const filename = encodeURIComponent(`แบบฟอร์มข้อมูลรายบุคคล-${project.name}.xlsx`);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "Cache-Control": "no-store",
    },
  });
}
