import { notFound } from "next/navigation";
import { getProject, isProjectContact, getAssignedQuestionnaire, getPersonPrefill, getPersonClinicalAssessments } from "@/lib/data";
import { QuestionnaireEntry } from "@/components/questionnaire/QuestionnaireEntry";
import { PersonToolScores } from "@/components/portal/PersonToolScores";
import { surveyScoreLabels } from "@/lib/questionnaire/surveyScoring";
import { monthLabelThai } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Fill one person's assigned questionnaire (in-app form → tool scores + derived AAI) + past results. */
export default async function PersonQuestionnairePage({ params }: { params: Promise<{ projectId: string; personId: string }> }) {
  const { projectId, personId } = await params;
  const [project, canEdit, assigned, prefill, history] = await Promise.all([
    getProject(projectId), isProjectContact(projectId), getAssignedQuestionnaire(projectId), getPersonPrefill(personId, projectId),
    getPersonClinicalAssessments(personId),
  ]);
  if (!project || !prefill) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4">
      <header>
        <h1 className="hero-heading">แบบสอบถามรายบุคคล</h1>
        <p className="mt-1 text-sm text-ink-soft">{project.name} · ผู้เข้าร่วม {prefill.personCode}</p>
      </header>
      {!assigned ? (
        <div className="rounded-card border border-warning/40 bg-warning-bg p-4 text-sm text-warning-fg">
          โครงการนี้ยังไม่ได้กำหนดแบบสอบถาม — ให้แอดมินกำหนดในหน้า “จัดการโครงการ”
        </div>
      ) : (
        <QuestionnaireEntry projectId={projectId} personId={personId} personCode={prefill.personCode}
          schema={assigned.schema} modules={assigned.modules} canEdit={canEdit}
          prefill={{ sex: prefill.sex, education: prefill.education, occupation: prefill.occupation }} />
      )}

      {history.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-ink">ประวัติแบบสอบถาม</h2>
          {history.map((h) => (
            <div key={h.id} className="space-y-2 rounded-card border border-border bg-surface p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink">{h.round === "post" ? "หลัง" : "ก่อน"} · {monthLabelThai(h.yearMonth)}</span>
                {h.aaiOverall != null && <span className="text-ink-soft">AAI รวม {h.aaiOverall}</span>}
              </div>
              <PersonToolScores title="" labelOverrides={surveyScoreLabels(assigned?.schema)}
                scores={h.toolScores.map((s) => ({ toolCode: s.toolCode, projectModule: s.projectModule, scoreLabel: s.scoreLabel, riskLevel: s.riskLevel, flag: s.flag }))} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
