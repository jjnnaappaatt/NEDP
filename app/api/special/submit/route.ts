import { NextResponse } from "next/server";
import { getAssignedQuestionnaire, submitClinicalAssessment, getPersonPreAnswers, isProjectContact, enrollPerson } from "@/lib/data";
import { buildClinical } from "@/lib/questionnaire/submit";
import { bundleById } from "@/lib/specialProjects";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SMART bundle submit: enter the full screening ONCE and write it to ALL member projects (full copy).
 * Assesses the primary person, then for each OTHER member project finds-or-enrolls a person with the SAME
 * person_code (+ demographics + consent) and assesses them with the identical answers. Gated: the caller
 * must be a contact of EVERY member project (so this can't be used to write into a project one isn't in).
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const projectId = String(b.projectId ?? "");
  const personId = String(b.personId ?? "");
  const round = String(b.round ?? "pre") === "post" ? "post" : "pre";
  const answers = (b.answers ?? {}) as Record<string, unknown>;
  const bundle = bundleById(String(b.bundleId ?? ""));
  if (!projectId || !personId || !bundle) return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  if (!bundle.memberIds.includes(projectId)) return NextResponse.json({ ok: false, error: "not_bundle_member" }, { status: 400 });

  // Caller must be a contact of ALL member projects.
  const contacts = await Promise.all(bundle.memberIds.map((m) => isProjectContact(m)));
  if (!contacts.every(Boolean)) return NextResponse.json({ ok: false, error: "not_contact" }, { status: 403 });

  const assigned = await getAssignedQuestionnaire(projectId);
  if (!assigned) return NextResponse.json({ ok: false, error: "no_questionnaire" }, { status: 400 });
  const prev = round === "post" ? await getPersonPreAnswers(personId, projectId) : null;
  const { rawAnswers, toolScores, riskSummary } = buildClinical(answers, prev, assigned.schema);

  // 1) primary member — the person the UI is on.
  const primary = await submitClinicalAssessment({
    projectId, personId, round, questionnaireId: assigned.questionnaireId,
    qAnswers: answers, rawAnswers, toolScores, status: "submitted",
  });
  if (!primary.ok) {
    const error = primary.error === "round_conflict"
      ? "มีแบบประเมินอีกรอบของเดือนนี้อยู่แล้ว — บันทึกรอบใหม่ในเดือนถัดไป หรือแก้ไขรายการเดิม"
      : primary.error;
    return NextResponse.json({ ...primary, error }, { status: primary.error === "not_contact" ? 403 : 400 });
  }

  // 2) mirror the SAME person + answers into the other member projects (shared person_code links them).
  const db = supabaseAdmin();
  const { data: pr } = await db.from("persons")
    .select("person_code,tambon_code,sex,age_band,education_level,occupation_code,consent_version")
    .eq("id", personId).maybeSingle();
  const mirrored: string[] = [];
  const mirrorErrors: { projectId: string; error: string }[] = [];
  if (pr) {
    for (const memberId of bundle.memberIds) {
      if (memberId === projectId) continue;
      const { data: existing } = await db.from("persons").select("id")
        .eq("project_id", memberId).eq("person_code", pr.person_code as string).maybeSingle();
      let mid = existing?.id as string | undefined;
      if (!mid) {
        const enr = await enrollPerson({
          projectId: memberId, personCode: String(pr.person_code), tambonCode: String(pr.tambon_code),
          sex: (pr.sex as string) ?? undefined, ageBand: (pr.age_band as string) ?? undefined,
          education: (pr.education_level as number) ?? undefined, occupation: (pr.occupation_code as number) ?? undefined,
          consentVersion: (pr.consent_version as string) ?? "v1",
        });
        if (enr.ok) mid = enr.personId; else mirrorErrors.push({ projectId: memberId, error: enr.error ?? "enroll_failed" });
      }
      if (mid) {
        const mr = await submitClinicalAssessment({
          projectId: memberId, personId: mid, round, questionnaireId: assigned.questionnaireId,
          qAnswers: answers, rawAnswers, toolScores, status: "submitted",
        });
        if (mr.ok) mirrored.push(memberId); else mirrorErrors.push({ projectId: memberId, error: mr.error ?? "assess_failed" });
      }
    }
  }
  return NextResponse.json({ ...primary, riskSummary, toolScores, mirrored, mirrorErrors }, { status: 200 });
}
