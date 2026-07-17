import Link from "next/link";
import { getMyPortalProjects, getAaiSnapshotSummary } from "@/lib/data";
import { AaiDashboard } from "@/components/portal/AaiDashboard";

export const dynamic = "force-dynamic";

/**
 * Interactive AAI-by-area dashboard (individual-level snapshot rollup), scoped to the signed-in user's
 * registered projects: จังหวัด/อำเภอ/ตำบล toggles, per-project checkboxes, three time-points. Initial
 * province-level rows are fetched server-side (one pass, no streaming — LINE WebView paints on load).
 */
export default async function PortalDashboardPage() {
  const projects = await getMyPortalProjects();

  if (!projects.length) {
    return (
      <div className="space-y-5">
        <header>
          <h1 className="hero-heading hero-heading--wrap">AAI Area Dashboard</h1>
        </header>
        <div className="card p-8 text-center text-ink-soft">
          คุณยังไม่ได้เป็นผู้รับผิดชอบโครงการใด — <Link href="/submit" className="text-accent hover:underline">ลงทะเบียนโครงการ</Link>
        </div>
      </div>
    );
  }

  const ids = projects.map((p) => p.id);
  const initialRows = await getAaiSnapshotSummary({ level: "province", projectIds: ids });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="hero-heading hero-heading--wrap">AAI Area Dashboard</h1>
        <p className="mt-2 text-sm text-ink-soft">
          สรุปคะแนน AAI รายบุคคล รวมตามจังหวัด/อำเภอ/ตำบล · เริ่มต้น → เดือนที่แล้ว → ล่าสุด
        </p>
      </header>
      <AaiDashboard projects={projects} initialRows={initialRows} />
    </div>
  );
}
