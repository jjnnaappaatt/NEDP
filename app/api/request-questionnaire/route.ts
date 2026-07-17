import { NextResponse } from "next/server";
import { requestQuestionnaire, isProjectContact } from "@/lib/data";
import { validateRawSurvey, type RawSurvey } from "@/lib/questionnaire/surveys";

export const dynamic = "force-dynamic";

/** A registered project member submits a custom questionnaire (JSON) → pending admin approval.
 *  POST { projectId, title, includeAai, json }. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const projectId = String(b.projectId ?? "");
  if (!projectId) return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
  // Only a project contact may request — otherwise anyone can spam the pending queue and push an
  // attacker-titled Flex message to the project head. See AUDIT.md → AUTHZ-request.
  if (!(await isProjectContact(projectId))) return NextResponse.json({ ok: false, error: "not_contact" }, { status: 403 });

  let payload: RawSurvey;
  try {
    payload = (typeof b.json === "string" ? JSON.parse(b.json) : b.json) as RawSurvey;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON ไม่ถูกต้อง" }, { status: 400 });
  }
  const invalid = validateRawSurvey(payload);
  if (invalid) return NextResponse.json({ ok: false, error: invalid }, { status: 400 });

  const title = (typeof b.title === "string" && b.title.trim()) || payload.title?.trim() || "แบบสอบถามของโครงการ";
  const includeAai = b.includeAai !== false;
  const r = await requestQuestionnaire(projectId, { title, includeAai, payload, note: (b.note as string) ?? undefined });
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
