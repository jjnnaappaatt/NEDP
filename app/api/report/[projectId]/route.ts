import { assembleReport, buildReportDocx, buildReportPdf } from "@/lib/server/report";
import { getCurrentMonth } from "@/lib/format";
import { getAdminSession } from "@/lib/admin-auth";
import { isProjectContact } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A real per-project monthly monitoring report — `?format=pdf|docx&month=YYYY-MM`.
 *  PDF embeds Sarabun for Thai; DOCX uses tables. Data is the project's per-ตำบล submitted values. */
export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const admin = await getAdminSession();
  if (!admin && !(await isProjectContact(projectId))) return new Response("forbidden", { status: 403 });
  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "docx" ? "docx" : "pdf";
  const month = url.searchParams.get("month") || getCurrentMonth();

  const data = await assembleReport(projectId, month);
  if (!data) return new Response("not found", { status: 404 });

  const safe = data.projectName.replace(/[\\/:*?"<>|]/g, " ").slice(0, 40).trim();
  const ext = format === "docx" ? "docx" : "pdf";
  const buf = format === "docx" ? await buildReportDocx(data) : await buildReportPdf(data);
  const ctype = format === "docx"
    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    : "application/pdf";
  const filename = encodeURIComponent(`รายงาน-${safe}-${month}.${ext}`);

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": ctype,
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "Cache-Control": "no-store",
    },
  });
}
