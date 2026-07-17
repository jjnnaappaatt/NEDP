import { getProjects, getProvinces, getAaiSnapshotSummary } from "@/lib/data";
import { AdminAaiDashboard } from "@/components/admin/AdminAaiDashboard";

export const dynamic = "force-dynamic";

/**
 * Admin AAI dashboard — ALL projects (not scoped to a registered user). "ตามพื้นที่" covers all-projects
 * overall + single-project จังหวัด/อำเภอ/ตำบล drill-down; "รายจังหวัด" adds the cross-project by-province view.
 */
export default async function AdminDashboardPage() {
  const [projects, provinces] = await Promise.all([getProjects(), getProvinces()]);
  const ids = projects.map((p) => p.id);
  const initialRows = ids.length ? await getAaiSnapshotSummary({ level: "province", projectIds: ids }) : [];
  const simpleProjects = projects.map((p) => ({ id: p.id, name: p.name, owner: p.researcher || p.org || "" }));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="hero-heading hero-heading--wrap">AAI Dashboard — ทุกโครงการ</h1>
        <p className="mt-2 text-sm text-ink-soft">
          เลือก <span className="font-medium text-ink">ทั้งหมด</span> เพื่อดูภาพรวม · เลือกโครงการเดียวเพื่อเจาะ
          จังหวัด/อำเภอ/ตำบล · หรือสลับเป็น <span className="font-medium text-ink">รายจังหวัด</span> เพื่อดูทุกโครงการในจังหวัดนั้น
        </p>
      </header>
      <AdminAaiDashboard projects={simpleProjects} initialRows={initialRows} provinces={provinces} />
    </div>
  );
}
