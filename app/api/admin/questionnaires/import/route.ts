import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { upsertQuestionnaire } from "@/lib/data";
import { surveyToSchema, validateRawSurvey, type RawSurvey } from "@/lib/questionnaire/surveys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9ก-๙]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "custom";

/** Admin import: a questionnaire JSON (the QR-CODE example format) → schema → registry.
 *  POST { title?, code?, version?, includeAai?, json }. Admin-gated. */
export async function POST(req: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  let raw: RawSurvey;
  try {
    raw = (typeof b.json === "string" ? JSON.parse(b.json) : b.json) as RawSurvey;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON ไม่ถูกต้อง — ตรวจสอบวงเล็บ/เครื่องหมาย" }, { status: 400 });
  }
  const invalid = validateRawSurvey(raw);
  if (invalid) return NextResponse.json({ ok: false, error: invalid }, { status: 400 });

  const title = (typeof b.title === "string" && b.title.trim()) || raw.title?.trim() || "แบบสอบถามของโครงการ";
  const code = slug(typeof b.code === "string" && b.code.trim() ? b.code : title);
  const version = (typeof b.version === "string" && b.version.trim()) || "v1.0";
  const includeAai = b.includeAai !== false; // default on
  const schema = surveyToSchema(raw, { includeAai });

  const res = await upsertQuestionnaire(code, version, title, "survey", schema);
  return NextResponse.json(
    { ...res, code, version, title, questions: raw.questions.length, includeAai },
    { status: res.ok ? 200 : 400 },
  );
}
