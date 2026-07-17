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

  const prev = round === "post" ? await getPersonPreAnswers(personId) : null;
  const { rawAnswers, toolScores, riskSummary } = buildClinical(answers, prev, assigned.schema);

  const res = await submitClinicalAssessment({
    projectId, personId, round, yearMonth, questionnaireId: assigned.questionnaireId,
    qAnswers: answers, rawAnswers, toolScores, status: "submitted",
  });
  return NextResponse.json({ ...res, riskSummary, toolScores }, { status: res.ok ? 200 : res.error === "not_contact" ? 403 : 400 });
}
