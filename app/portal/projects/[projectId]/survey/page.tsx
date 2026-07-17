import { notFound } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { getAdminSession } from "@/lib/admin-auth";
import { getProject, isProjectContact, getAssignedQuestionnaire, getProjectSurveyDashboard } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { SurveyDashboard } from "@/components/portal/SurveyDashboard";

export const dynamic = "force-dynamic";

/** A project's own custom-questionnaire dashboard (aggregate) — separate from the standard AAI view.
 *  Visible to the project's contacts and to admin. */
export default async function ProjectSurveyDashboardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const [project, contact, admin] = await Promise.all([
    getProject(projectId),
    isProjectContact(projectId),
    getAdminSession(),
  ]);
  if (!project) notFound();
  if (!contact && !admin) notFound();

  const [assigned, data] = await Promise.all([
    getAssignedQuestionnaire(projectId),
    getProjectSurveyDashboard(projectId),
  ]);

  return (
    <div className="space-y-4">
      <Link href={`/submit/${projectId}`} className="inline-flex items-center gap-1 text-sm text-ink-muted transition hover:text-accent">
        <IconArrowLeft size={15} /> กลับ
      </Link>
      {!assigned ? (
        <Card className="border border-warning/40 bg-warning-bg p-4 text-sm text-warning-fg">
          โครงการนี้ยังไม่ได้กำหนดแบบสอบถาม — เพิ่มแบบสอบถามของโครงการก่อนจึงจะมีแดชบอร์ดนี้
        </Card>
      ) : (
        <SurveyDashboard projectName={project.name} data={data} />
      )}
    </div>
  );
}
