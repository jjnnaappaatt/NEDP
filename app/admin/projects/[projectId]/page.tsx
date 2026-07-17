import { notFound } from "next/navigation";
import { getProject, getLocationStatuses, getAaiSnapshotSummary } from "@/lib/data";
import { getCurrentMonth } from "@/lib/format";
import { AdminProjectDashboard } from "@/components/admin/AdminProjectDashboard";

export const dynamic = "force-dynamic";

/** Admin per-project dashboard — one project's standard AAI (Overall + D1–D4) + submission progress. */
export default async function AdminProjectDashboardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const month = getCurrentMonth();
  const [project, locs, initialRows] = await Promise.all([
    getProject(projectId),
    getLocationStatuses(projectId, month),
    getAaiSnapshotSummary({ level: "province", projectIds: [projectId] }),
  ]);
  if (!project) notFound();

  const done = locs.filter((l) => l.submitted).length;
  const total = locs.length;
  const status = total > 0 && done === total ? "submitted" : done > 0 ? "draft" : "not_started";
  const pickerProject = { id: project.id, name: project.name, owner: project.researcher || project.org || "" };

  return (
    <AdminProjectDashboard
      project={pickerProject}
      progress={{ done, total, status }}
      initialRows={initialRows}
    />
  );
}
