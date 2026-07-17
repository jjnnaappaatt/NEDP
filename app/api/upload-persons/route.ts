import { NextResponse } from "next/server";
import { getLocations, isProjectContact, isIntegrationEnabled, bulkEnrollAssess, type BulkPersonRow } from "@/lib/data";
import { parseSheet } from "@/lib/server/xlsx";
import { locKey } from "@/lib/factMonthly";
import { CURRENT_MONTH } from "@/lib/format";
import {
  PERSON_COLUMNS, PERSON_TH_TO_KEY, PERSON_LOC_KEYS, deriveAgeBand, toRawAnswers, type PersonColumn,
} from "@/lib/factPersons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // per-person enroll+assess RPC pairs

const MAX_ROWS = 1000; // guardrail — split very large files
const LOC_KEYS = PERSON_LOC_KEYS as readonly string[];

/** Map an input cell to the column's canonical value (Thai label → code, else pass through). */
function normalizeEnum(col: PersonColumn, v: string): string {
  const t = v.trim();
  if (!col.enumMap || t === "") return t;
  if (t in col.enumMap) return col.enumMap[t];
  const vals = new Set(Object.values(col.enumMap));
  if (vals.has(t)) return t;
  const lk = t.toLowerCase();
  for (const [k, val] of Object.entries(col.enumMap)) if (k.toLowerCase() === lk) return val;
  return t;
}

/**
 * Bulk per-person questionnaire intake. `mode=preview` parses + validates and returns a dry-run report
 * (NO writes). `mode=commit` enrolls + derived-assesses the valid rows. Rows matched to a project tambon
 * by จังหวัด/อำเภอ/ตำบล; consent is hard-required. Gated by project contact + integration-enabled.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const projectId = String(form?.get("projectId") ?? "");
  const mode = String(form?.get("mode") ?? "preview") === "commit" ? "commit" : "preview";
  if (!projectId || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "projectId and file required" }, { status: 400 });
  }
  if (!(await isProjectContact(projectId))) return NextResponse.json({ ok: false, error: "not_contact" }, { status: 403 });
  if (!(await isIntegrationEnabled(projectId))) return NextResponse.json({ ok: false, error: "not_enabled" }, { status: 403 });

  const { header, rows } = await parseSheet(await file.arrayBuffer(), file.name);
  if (rows.length === 0) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });

  // header (Thai) → PERSON_COLUMNS.key → column index
  const colIndex = new Map<string, number>();
  header.forEach((h, i) => { const k = PERSON_TH_TO_KEY.get(h.trim()); if (k) colIndex.set(k, i); });
  if (!LOC_KEYS.every((k) => colIndex.has(k))) {
    return NextResponse.json({ ok: false, error: "missing_columns" }, { status: 400 });
  }

  // locKey → tambon_code (only mapped project locations)
  const locations = await getLocations(projectId);
  const keyToTambon = new Map<string, string>();
  for (const l of locations) if (l.tambonCode) keyToTambon.set(locKey(l.province, l.amphoe, l.tambon), l.tambonCode);
  const ambiguous = locations.filter((l) => l.tambonCode).length - keyToTambon.size;

  const valid: BulkPersonRow[] = [];
  const sample: { rowNo: number; code: string; tambon: string; action: string; errors: string[] }[] = [];
  let unmatched = 0, invalid = 0, blankSkipped = 0, piiWarning = false, truncated = false;

  for (let ri = 0; ri < rows.length; ri++) {
    if (valid.length + invalid >= MAX_ROWS) { truncated = true; break; }
    const raw = rows[ri];
    const cell = (k: string) => (colIndex.has(k) ? (raw[colIndex.get(k)!] ?? "").trim() : "");

    // normalized row keyed by PERSON_COLUMNS.key
    const row: Record<string, string> = {};
    for (const c of PERSON_COLUMNS) if (colIndex.has(c.key)) row[c.key] = normalizeEnum(c, cell(c.key));

    // skip untouched template rows (loc prefilled, nothing else)
    const hasContent = PERSON_COLUMNS.some((c) => !LOC_KEYS.includes(c.key) && (row[c.key] ?? "") !== "");
    if (!hasContent) { blankSkipped++; continue; }

    const errors: string[] = [];
    const prov = row.province ?? "", amp = row.amphoe ?? "", tam = row.tambon ?? "";
    const tambonCode = keyToTambon.get(locKey(prov, amp, tam));
    if (!tambonCode) { unmatched++; errors.push("ไม่พบพื้นที่นี้ในโครงการ (จังหวัด/อำเภอ/ตำบล)"); }
    if ((row.consent ?? "") !== "1") errors.push("ต้องได้รับความยินยอม (PDPA)");

    // numeric range checks on scored fields
    for (const c of PERSON_COLUMNS) {
      const v = row[c.key];
      if (!c.rawKey || c.min == null || c.max == null || v == null || v === "") continue;
      const n = Number(v);
      if (!Number.isFinite(n)) errors.push(`${c.th}: ไม่ใช่ตัวเลข`);
      else if (n < c.min || n > c.max) errors.push(`${c.th}: ต้องอยู่ระหว่าง ${c.min}–${c.max}`);
    }

    const ageRaw = row.age ?? "";
    const ageBand = ageRaw ? deriveAgeBand(Number(ageRaw)) : null;
    if (ageRaw && !ageBand) errors.push("อายุ: ต้อง ≥ 50 ปี");

    const personCode = (row.person_code ?? "").trim() || null;
    const fullName = (row.full_name ?? "").trim() || null;
    if (fullName) piiWarning = true;

    if (errors.length) {
      invalid++;
      if (sample.length < 15) sample.push({ rowNo: ri + 2, code: personCode ?? "(ใหม่)", tambon: tam, action: "ไม่ถูกต้อง", errors });
      continue;
    }

    valid.push({
      tambonCode: tambonCode!, personCode, fullName,
      sex: (row.sex ?? "").trim() || null,
      ageBand,
      education: row.education ? Number(row.education) : null,
      occupation: row.occupation ? Number(row.occupation) : null,
      consentVersion: "v1",
      round: (row.round ?? "").trim() || "pre",
      yearMonth: (row.year_month ?? "").trim() || CURRENT_MONTH,
      rawAnswers: toRawAnswers(row),
    });
    if (sample.length < 15) {
      sample.push({ rowNo: ri + 2, code: personCode ?? "(ใหม่)", tambon: tam, action: personCode ? "อัปเดต" : "เพิ่มใหม่", errors: [] });
    }
  }

  const willEnroll = valid.filter((v) => !v.personCode).length;
  const willAssess = valid.length - willEnroll;
  const report = {
    ok: true as const, mode,
    total: rows.length, valid: valid.length, willEnroll, willAssess,
    invalid, unmatched, ambiguous, blankSkipped, truncated, piiWarning, sample,
  };

  if (mode === "preview") return NextResponse.json(report);

  if (valid.length === 0) {
    return NextResponse.json({ ...report, ok: false, error: unmatched > 0 ? "no_match" : "no_valid_rows" }, { status: 400 });
  }
  const res = await bulkEnrollAssess({ projectId, rows: valid });
  return NextResponse.json(
    { ...res, invalid, unmatched, ambiguous, blankSkipped, truncated },
    { status: res.ok || res.enrolled + res.assessed > 0 ? 200 : res.error === "not_contact" || res.error === "not_enabled" ? 403 : 400 },
  );
}
