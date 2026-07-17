import { NextResponse } from "next/server";
import { bulkSubmitLocations, getLocations } from "@/lib/data";
import { parseSheet } from "@/lib/server/xlsx";
import { LOC_COLUMNS, TH_TO_KEY, locKey } from "@/lib/factMonthly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bulk-submit monthly data from an uploaded .xlsx/.csv (FactMonthlyMonitor format). Rows are
 *  matched to project locations by จังหวัด/อำเภอ/ตำบล (no id column). */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const projectId = String(form?.get("projectId") ?? "");
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
  const factCols = header
    .map((h, c) => ({ c, key: TH_TO_KEY.get(h.trim()) }))
    .filter((x): x is { c: number; key: string } => !!x.key);

  const locations = await getLocations(projectId);
  const keyToId = new Map(locations.map((l) => [locKey(l.province, l.amphoe, l.tambon), l.id]));
  // >0 ⇒ the project has locations that share จังหวัด/อำเภอ/ตำบล, so key-matching is ambiguous.
  // Surfaced (not silent) so it can't masquerade as a clean import.
  const ambiguous = locations.length - keyToId.size;

  const outRows: { locationId: string; values: Record<string, string> }[] = [];
  let unmatched = 0;
  for (const r of rows) {
    const locationId = keyToId.get(locKey(r[iProv] ?? "", r[iAmp] ?? "", r[iTam] ?? ""));
    if (!locationId) { unmatched++; continue; }
    const values: Record<string, string> = {};
    for (const { c, key } of factCols) {
      const v = (r[c] ?? "").trim();
      if (v !== "") values[key] = v;
    }
    // Skip untouched rows — the template ships prefilled with every location, so a blank row must
    // not silently mark a location "submitted" with no data.
    if (Object.keys(values).length === 0) continue;
    outRows.push({ locationId, values });
  }
  if (outRows.length === 0) {
    return NextResponse.json({ ok: false, error: unmatched > 0 ? "no_match" : "no_data", unmatched }, { status: 400 });
  }
  const res = await bulkSubmitLocations({ projectId, rows: outRows });
  return NextResponse.json(
    { ...res, unmatched, ambiguous },
    { status: res.ok ? 200 : res.error === "not_contact" ? 403 : 400 },
  );
}
