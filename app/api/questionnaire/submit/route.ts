import { NextResponse } from "next/server";
import { getAssignedQuestionnaire, submitClinicalAssessment, getPersonPreAnswers, isProjectContact } from "@/lib/data";
import { buildClinical } from "@/lib/questionnaire/submit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Submit one person's clinical questionnaire: compute BMI + tool scores + AAI raw, store via
 *  assess_person_clinical, and return the scores + per-project risk for immediate display. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const projectId = String(b.projectId ?? "");
  const personId = String(b.personId ?? "");
  const round = String(b.round ?? "pre") === "post" ? "post" : "pre";
  const yearMonth = b.yearMonth ? String(b.yearMonth) : undefined;
  const answers = (b.answers ?? {}) as Record<string, unknown>;
  if (!projectId || !personId) return NextResponse.json({ ok: false, error: "projectId and personId required" }, { status: 400 });
  if (!(await isProjectContact(projectId))) return NextResponse.json({ ok: false, error: "not_contact" }, { status: 403 });

  const assigned = await getAssignedQuestionnaire(projectId);
  if (!assigned) return NextResponse.json({ ok: false, error: "no_questionnaire" }, { status: 400 });

  // Bound to projectId: only reads pre-answers for a person in THIS project (no cross-project leak).
  const prev = round === "post" ? await getPersonPreAnswers(personId, projectId) : null;
  const { rawAnswers, toolScores, riskSummary } = buildClinical(answers, prev, assigned.schema);

  const res = await submitClinicalAssessment({
    projectId, personId, round, yearMonth, questionnaireId: assigned.questionnaireId,
    qAnswers: answers, rawAnswers, toolScores, status: "submitted",
  });
  // Never return computed scores on a denied/failed write — only on success.
  if (!res.ok) {
    const error = res.error === "round_conflict"
      ? "มีแบบประเมินอีกรอบของเดือนนี้อยู่แล้ว — บันทึกรอบใหม่ในเดือนถัดไป หรือแก้ไขรายการเดิม (ไม่ทับข้อมูลเดิม)"
      : res.error;
    return NextResponse.json({ ...res, error }, { status: res.error === "not_contact" ? 403 : 400 });
  }
  return NextResponse.json({ ...res, riskSummary, toolScores }, { status: 200 });
}
