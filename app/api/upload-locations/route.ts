import { NextResponse } from "next/server";
import { saveLocations, getLocations } from "@/lib/data";
import { parseSheet } from "@/lib/server/xlsx";
import { LOC_COLUMNS, locKey } from "@/lib/factMonthly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Replace a project's location list from an uploaded .xlsx/.csv (จังหวัด/อำเภอ/ตำบล, no id).
 *  Existing rows are matched by จังหวัด/อำเภอ/ตำบล so they update in place; new rows are inserted;
 *  omitted rows are removed (unless they already have submissions → returned in `blocked`). */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const projectId = String(form?.get("projectId") ?? "");
  const editedBy = String(form?.get("editedBy") ?? "") || undefined;
  if (!projectId || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "projectId and file required" }, { status: 400 });
  }
  const { header, rows } = await parseSheet(await file.arrayBuffer(), file.name);
  if (rows.length === 0) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });

  const iProv = header.findIndex((h) => h.trim() === LOC_COLUMNS[0].th);
  const iAmp = header.findIndex((h) => h.trim() === LOC_COLUMNS[1].th);
  const iTam = header.findIndex((h) => h.trim() === LOC_COLUMNS[2].th);
  if (iProv < 0 || iAmp < 0 || iTam < 0) {
    return NextResponse.json({ ok: false, error: "missing_columns" }, { status: 400 });
  }

  // Resolve each row's id by (province, amphoe, tambon) so unchanged rows update in place.
  const existing = await getLocations(projectId);
  const keyToId = new Map(existing.map((l) => [locKey(l.province, l.amphoe, l.tambon), l.id]));

  const locs = rows
    .map((r) => ({
      province: (r[iProv] ?? "").trim(),
      amphoe: (r[iAmp] ?? "").trim(),
      tambon: (r[iTam] ?? "").trim(),
    }))
    .filter((l) => l.province || l.amphoe || l.tambon)
    .map((l, i) => ({ id: keyToId.get(locKey(l.province, l.amphoe, l.tambon)) ?? `new-${i + 1}`, ...l }));

  if (locs.length === 0) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
  const res = await saveLocations({ projectId, locations: locs, editedBy });
  return NextResponse.json(res, { status: res.ok ? 200 : res.error === "not_contact" ? 403 : 400 });
}
