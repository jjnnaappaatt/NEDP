import { getAdminProjects, getHeadRequests, getIntegrationRequests, getQuestionnaireRequests, listQuestionnaires, getProjectQuestionnaires } from "@/lib/data";
import { ProjectsManager } from "@/components/admin/ProjectsManager";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const [projects, headRequests, integrationRequests, questionnaireRequests, questionnaires, projectQuestionnaires] = await Promise.all([
    getAdminProjects(), getHeadRequests(), getIntegrationRequests(), getQuestionnaireRequests(), listQuestionnaires(), getProjectQuestionnaires(),
  ]);
  return (
    <div className="space-y-5">
      <header>
        <h1 className="hero-heading hero-heading--wrap">จัดการโครงการ</h1>
        <p className="mt-2 text-sm text-ink-soft">
          เพิ่ม · แก้ไข · ลบ · ตั้งหัวหน้า/รูปโครงการ · อนุมัติคำขอหัวหน้า/นำเข้าข้อมูล · {projects.length} โครงการ
        </p>
      </header>
      <ProjectsManager initial={projects} headRequests={headRequests} integrationRequests={integrationRequests}
        questionnaireRequests={questionnaireRequests}
        questionnaires={questionnaires} projectQuestionnaires={projectQuestionnaires} />
    </div>
  );
}
