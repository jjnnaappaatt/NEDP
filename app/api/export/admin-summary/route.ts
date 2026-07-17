import { getAdminSession } from "@/lib/admin-auth";
import { getAdminProjectSummaries } from "@/lib/data";
import { buildAdminSummaryWorkbook } from "@/lib/server/xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Admin aggregate export — GET /api/export/admin-summary?month=YYYY-MM (default = current month).
 *  ONE ROW PER PROJECT: submission progress + Overall AAI + D1–D4. Admin only; deliberately no
 *  per-person rows, roster, raw answers, or indicator columns. */
export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return new Response("forbidden", { status: 403 });

  const url = new URL(req.url);
  const monthParam = url.searchParams.get("month") || "";
  const month = /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : undefined;

  const rows = await getAdminProjectSummaries(month);
  const buf = await buildAdminSummaryWorkbook(rows, month ?? "ล่าสุด");

  const filename = encodeURIComponent(`สรุป-AAI-รายโครงการ-${month ?? "ล่าสุด"}.xlsx`);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "Cache-Control": "no-store",
    },
  });
}
