import { getProject, getLocations, getLatestSubmissionData, isProjectContact } from "@/lib/data";
import { getAdminSession } from "@/lib/admin-auth";
import { buildSubmissionsWorkbook } from "@/lib/server/xlsx";
import { getCurrentMonth } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Download the monthly-report data template (.xlsx) for one project — FactMonthlyMonitor format,
 *  prefilled with the contact's latest submitted values for this month so they can continue editing.
 *  Carries REAL submitted data — admin or that project's contact only. */
export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const admin = await getAdminSession();
  if (!admin && !(await isProjectContact(projectId))) return new Response("forbidden", { status: 403 });
  const [project, locations, latest] = await Promise.all([
    getProject(projectId), getLocations(projectId), getLatestSubmissionData(projectId, getCurrentMonth()),
  ]);
  if (!project) return new Response("not found", { status: 404 });
  const buf = await buildSubmissionsWorkbook(project.name, locations, latest);
  const filename = encodeURIComponent(`แบบฟอร์มรายงานรายเดือน-${project.name}.xlsx`);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "Cache-Control": "no-store",
    },
  });
}
