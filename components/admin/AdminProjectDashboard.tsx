import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { AaiDashboard } from "@/components/portal/AaiDashboard";
import type { AaiSnapshotRow, PickerProject } from "@/lib/data";

/**
 * Project-first admin dashboard: one project's submission progress + its standard AAI (Overall + D1–D4,
 * 3 time-points) on a single surface. The AAI block reuses <AaiDashboard/> pinned to this one project —
 * with a single project its multi-select is hidden and scope is fixed, while the จังหวัด→อำเภอ→ตำบล→บุคคล
 * drill still works.
 */
export function AdminProjectDashboard({
  project, progress, initialRows,
}: {
  project: PickerProject;
  progress: { done: number; total: number; status: "submitted" | "draft" | "not_started" };
  initialRows: AaiSnapshotRow[];
}) {
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-ink-muted transition hover:text-accent">
          <IconArrowLeft size={15} /> กลับสู่ AAI Dashboard ทุกโครงการ
        </Link>
        <h1 className="hero-heading hero-heading--wrap">{project.name}</h1>
        {project.owner && <p className="text-sm text-ink-soft">ผู้รับผิดชอบ: {project.owner}</p>}
      </header>

      <Card className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold text-ink">ความคืบหน้าการส่งข้อมูลเดือนนี้</h2>
          <StatusBadge status={progress.status} />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-soft">
            <div className={`h-full rounded-full ${pct === 100 ? "bg-success" : "bg-accent"}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="whitespace-nowrap text-xs font-medium text-ink-soft">{progress.done}/{progress.total} พื้นที่</span>
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">คะแนน AAI (Overall + 4 มิติ)</h2>
        <AaiDashboard projects={[project]} initialRows={initialRows} />
      </section>
    </div>
  );
}
