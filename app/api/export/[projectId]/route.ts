import { getAdminSession } from "@/lib/admin-auth";
import { isProjectContact, getRawExport, getProject } from "@/lib/data";
import { buildRawExportWorkbook } from "@/lib/server/xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Raw-data export — GET /api/export/{projectUuid}?month=YYYY-MM|all (default all history).
 *  Multi-sheet xlsx, CODES ONLY (no decrypted names). Scoped to ONE project — admin or that project's
 *  contact (mirrors /api/report auth). The former admin `all`-projects raw pull was removed; admin now
 *  uses the project-level aggregate at /api/export/admin-summary (no per-person data). */
export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (projectId === "all") return new Response("forbidden", { status: 403 });
  const admin = await getAdminSession();
  if (!admin && !(await isProjectContact(projectId))) return new Response("forbidden", { status: 403 });
  const project = await getProject(projectId);
  if (!project) return new Response("not found", { status: 404 });

  const url = new URL(req.url);
  const monthParam = url.searchParams.get("month") || "all";
  const month = /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : undefined;

  const data = await getRawExport({ projectIds: [projectId], month });
  const buf = await buildRawExportWorkbook(data, { multiProject: false });

  const safe = project.name.replace(/[\\/:*?"<>|]/g, " ").slice(0, 40).trim();
  const filename = encodeURIComponent(`ข้อมูลดิบ-${safe}-${month ?? "ทั้งหมด"}.xlsx`);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "Cache-Control": "no-store",
    },
  });
}
