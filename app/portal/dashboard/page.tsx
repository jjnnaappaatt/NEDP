import Link from "next/link";
import { getMyPortalProjects, getAaiSnapshotSummary, getProjectSurveyDashboard } from "@/lib/data";
import { DashboardTabs } from "@/components/portal/DashboardTabs";
import { resolveToRealProject } from "@/lib/specialProjects";

export const dynamic = "force-dynamic";

/**
 * The user's "Dashboard": BOTH the AAI-by-area dashboard (individual-level snapshot rollup, จังหวัด/อำเภอ/
 * ตำบล drilldown, three time-points) AND each project's own questionnaire (survey) dashboard, under one
 * toggle. Scoped to the signed-in user's registered projects. Initial province-level AAI rows + the first
 * project's survey are fetched server-side (LINE WebView paints on load).
 */
export default async function PortalDashboardPage() {
  const projects = await getMyPortalProjects();

  if (!projects.length) {
    return (
      <div className="space-y-5">
        <header>
          <h1 className="hero-heading hero-heading--wrap">Dashboard</h1>
        </header>
        <div className="card p-8 text-center text-ink-soft">
          คุณยังไม่ได้เป็นผู้รับผิดชอบโครงการใด — <Link href="/submit" className="text-accent hover:underline">ลงทะเบียนโครงการ</Link>
        </div>
      </div>
    );
  }

  const ids = projects.map((p) => p.id);
  const [initialRows, initialSurvey] = await Promise.all([
    getAaiSnapshotSummary({ level: "province", projectIds: ids }),
    getProjectSurveyDashboard(resolveToRealProject(projects[0].id)),
  ]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="hero-heading hero-heading--wrap">Dashboard</h1>
        <p className="mt-2 text-sm text-ink-soft">
          ภาพรวมโครงการของคุณ — คะแนน AAI รายพื้นที่ และผลแบบสอบถามเฉพาะโครงการ
        </p>
      </header>
      <DashboardTabs
        projects={projects}
        initialAaiRows={initialRows}
        initialSurvey={initialSurvey}
        initialSurveyProjectId={projects[0].id}
      />
    </div>
  );
}
