import { NextResponse } from "next/server";
import {
  getLocations, getAssignedQuestionnaire, isProjectContact, isIntegrationEnabled,
  bulkEnrollAssessClinical, type BulkClinicalRow,
} from "@/lib/data";
import { parseSheet } from "@/lib/server/xlsx";
import { locKey } from "@/lib/factMonthly";
import { CURRENT_MONTH } from "@/lib/format";
import { deriveAgeBand } from "@/lib/factPersons";
import { schemaToColumns, type QCol } from "@/lib/questionnaire/columns";
import { buildClinical } from "@/lib/questionnaire/submit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_ROWS = 800; // per-row enroll + clinical assess

/** Map an input cell to a column's canonical value (Thai label → stored value, else pass through). */
function normalize(c: QCol, v: string): string {
  const t = v.trim();
  if (!c.labelToValue || t === "") return t;
  if (t in c.labelToValue) return c.labelToValue[t];
  const lk = t.toLowerCase();
  for (const [k, val] of Object.entries(c.labelToValue)) if (k.toLowerCase() === lk) return val;
  return t;
}
const sexFromG = (v: string): string | null => (v === "0" ? "M" : v === "1" ? "F" : v ? "other" : null);

/** Bulk per-project questionnaire intake. mode=preview → dry-run report; mode=commit → enroll + clinical
 *  assess (scores + AAI computed server-side). Gated by project contact + integration-enabled. */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const projectId = String(form?.get("projectId") ?? "");
  const mode = String(form?.get("mode") ?? "preview") === "commit" ? "commit" : "preview";
  if (!projectId || !(file instanceof File)) return NextResponse.json({ ok: false, error: "projectId and file required" }, { status: 400 });
  if (!(await isProjectContact(projectId))) return NextResponse.json({ ok: false, error: "not_contact" }, { status: 403 });
  if (!(await isIntegrationEnabled(projectId))) return NextResponse.json({ ok: false, error: "not_enabled" }, { status: 403 });

  const assigned = await getAssignedQuestionnaire(projectId);
  if (!assigned) return NextResponse.json({ ok: false, error: "no_questionnaire" }, { status: 400 });
  const cols = schemaToColumns(assigned.schema, assigned.modules);
  const colByKey = new Map(cols.map((c) => [c.key, c]));

  const { header, rows } = await parseSheet(await file.arrayBuffer(), file.name);
  if (rows.length === 0) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });

  const colIndex = new Map<string, number>();
  header.forEach((h, i) => { for (const c of cols) if (c.th === h.trim()) colIndex.set(c.key, i); });
  if (!["province", "amphoe", "tambon"].every((k) => colIndex.has(k))) {
    return NextResponse.json({ ok: false, error: "missing_columns" }, { status: 400 });
  }

  const locations = await getLocations(projectId);
  const keyToTambon = new Map<string, string>();
  for (const l of locations) if (l.tambonCode) keyToTambon.set(locKey(l.province, l.amphoe, l.tambon), l.tambonCode);
  const ambiguous = locations.filter((l) => l.tambonCode).length - keyToTambon.size;

  const valid: BulkClinicalRow[] = [];
  const sample: { rowNo: number; code: string; tambon: string; action: string; errors: string[] }[] = [];
  let unmatched = 0, invalid = 0, blankSkipped = 0, piiWarning = false, truncated = false;

  for (let ri = 0; ri < rows.length; ri++) {
    if (valid.length + invalid >= MAX_ROWS) { truncated = true; break; }
    const raw = rows[ri];
    const cell = (k: string) => (colIndex.has(k) ? (raw[colIndex.get(k)!] ?? "").trim() : "");
    const row: Record<string, string> = {};
    for (const c of cols) if (colIndex.has(c.key)) row[c.key] = normalize(c, cell(c.key));

    // skip an untouched seeded row (loc only)
    const hasContent = cols.some((c) => !["province", "amphoe", "tambon"].includes(c.key) && (row[c.key] ?? "") !== "");
    if (!hasContent) { blankSkipped++; continue; }

    const errors: string[] = [];
    const prov = row.province ?? "", amp = row.amphoe ?? "", tam = row.tambon ?? "";
    const tambonCode = keyToTambon.get(locKey(prov, amp, tam));
    if (!tambonCode) { unmatched++; errors.push("ไม่พบพื้นที่นี้ในโครงการ"); }
    if ((row.consent ?? "") !== "1") errors.push("ต้องได้รับความยินยอม (PDPA)");

    // validate question columns + build answers
    const answers: Record<string, string> = {};
    for (const c of cols) {
      if (c.kind !== "question") continue;
      const v = row[c.key];
      if (v == null || v === "") continue;
      if (c.optionValues?.length && !c.optionValues.includes(v)) { errors.push(`${c.th}: ค่าไม่ถูกต้อง`); continue; }
      if (c.qtype === "number" && (c.min != null || c.max != null)) {
        const n = Number(v);
        if (!Number.isFinite(n)) { errors.push(`${c.th}: ไม่ใช่ตัวเลข`); continue; }
        if ((c.min != null && n < c.min) || (c.max != null && n > c.max)) { errors.push(`${c.th}: ต้องอยู่ระหว่าง ${c.min}–${c.max}`); continue; }
      }
      answers[c.key] = v;
    }

    const personCode = (row.person_code ?? "").trim() || null;
    const fullName = (row.full_name ?? "").trim() || null;
    if (fullName) piiWarning = true;
    const ageRaw = answers["G.age"];
    const ageBand = ageRaw ? deriveAgeBand(Number(ageRaw)) : null;

    if (errors.length) {
      invalid++;
      if (sample.length < 15) sample.push({ rowNo: ri + 2, code: personCode ?? "(ใหม่)", tambon: tam, action: "ไม่ถูกต้อง", errors });
      continue;
    }

    const { rawAnswers, toolScores } = buildClinical(answers, null, assigned.schema);
    valid.push({
      tambonCode: tambonCode!, personCode, fullName,
      sex: sexFromG(answers["G.sex"] ?? ""), ageBand,
      education: answers["G.education"] ? Number(answers["G.education"]) : null,
      occupation: answers["G.occupation"] ? Number(answers["G.occupation"]) : null,
      consentVersion: "v1", round: (row.round ?? "").trim() || "pre",
      yearMonth: (row.year_month ?? "").trim() || CURRENT_MONTH,
      questionnaireId: assigned.questionnaireId, qAnswers: answers, rawAnswers, toolScores,
    });
    if (sample.length < 15) sample.push({ rowNo: ri + 2, code: personCode ?? "(ใหม่)", tambon: tam, action: personCode ? "อัปเดต" : "เพิ่มใหม่", errors: [] });
  }

  const willEnroll = valid.filter((v) => !v.personCode).length;
  const report = {
    ok: true as const, mode, total: rows.length, valid: valid.length, willEnroll, willAssess: valid.length - willEnroll,
    invalid, unmatched, ambiguous, blankSkipped, truncated, piiWarning, sample,
  };
  if (mode === "preview") return NextResponse.json(report);
  if (valid.length === 0) return NextResponse.json({ ...report, ok: false, error: unmatched > 0 ? "no_match" : "no_valid_rows" }, { status: 400 });

  const res = await bulkEnrollAssessClinical({ projectId, rows: valid });
  return NextResponse.json(
    { ...res, invalid, unmatched, ambiguous, blankSkipped, truncated },
    { status: res.ok || res.enrolled + res.assessed > 0 ? 200 : res.error === "not_contact" || res.error === "not_enabled" ? 403 : 400 },
  );
}
