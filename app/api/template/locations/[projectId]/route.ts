import { getProject, getLocations, isProjectContact } from "@/lib/data";
import { getAdminSession } from "@/lib/admin-auth";
import { buildLocationsWorkbook } from "@/lib/server/xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Download the location-list template (.xlsx) for one project — จังหวัด/อำเภอ/ตำบล, no id.
 *  Carries the project's real area list — admin or that project's contact only. */
export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const admin = await getAdminSession();
  if (!admin && !(await isProjectContact(projectId))) return new Response("forbidden", { status: 403 });
  const [project, locations] = await Promise.all([getProject(projectId), getLocations(projectId)]);
  if (!project) return new Response("not found", { status: 404 });
  const buf = await buildLocationsWorkbook(project.name, locations);
  const filename = encodeURIComponent(`รายชื่อพื้นที่-${project.name}.xlsx`);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "Cache-Control": "no-store",
    },
  });
}
