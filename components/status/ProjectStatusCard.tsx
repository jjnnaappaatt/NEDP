import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { IconTrophy, IconMapPin, IconArrowRight, IconPencil } from "@tabler/icons-react";
import { UnregisterButton } from "@/components/status/UnregisterButton";
import { isBundleId, bundleById, resolveToRealProject } from "@/lib/specialProjects";
import type { MyProjectStatus } from "@/types";

/**
 * สถานะ card — one registered project + per-location submission progress (X/N พื้นที่).
 * "Done" only when every location is submitted → "ดูข้อมูล"; otherwise → "กรอกข้อมูล".
 */
export function ProjectStatusCard({ item }: { item: MyProjectStatus }) {
  const { project, status, points, locationsDone, locationsTotal } = item;
  const done = locationsTotal > 0 && locationsDone === locationsTotal;
  const pct = locationsTotal === 0 ? 0 : Math.round((locationsDone / locationsTotal) * 100);
  const bundle = isBundleId(project.id);
  const submitHref = bundle ? `/submit/special/${bundleById(project.id)!.id}` : `/submit/${project.id}`;
  const statusHref = `/status/${resolveToRealProject(project.id)}`;

  return (
    <Card className="flex flex-col gap-3 animate-fadeUp">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-10 w-1.5 shrink-0 rounded-full" style={{ background: project.accent }} aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 font-display text-base font-semibold leading-snug text-ink">{project.name}</h2>
          <p className="mt-1 truncate text-sm text-ink-soft">
            ผู้รับผิดชอบ: {project.researcher || project.org || "—"}
          </p>
        </div>
        {!bundle && <UnregisterButton projectId={project.id} projectName={project.name} />}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={status} />
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-surface-soft px-2.5 py-1 text-xs font-semibold text-ink-soft">
          <IconMapPin size={14} stroke={1.8} />
          ส่งแล้ว {locationsDone}/{locationsTotal} พื้นที่
        </span>
        {typeof points === "number" && (
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-ink-accent">
            <IconTrophy size={14} stroke={1.8} />
            {points} คะแนน
          </span>
        )}
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-soft">
        <div className={`h-full rounded-full ${done ? "bg-success" : "bg-accent"}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-auto flex gap-2">
        <Link
          href={submitHref}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center whitespace-nowrap rounded-card bg-accent px-3 text-[15px] font-medium text-[var(--on-accent)] transition hover:brightness-110 active:brightness-95"
        >
          <IconPencil size={17} stroke={2} className="mr-1.5" /> ส่งข้อมูล
        </Link>
        <Link
          href={statusHref}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center whitespace-nowrap rounded-card border border-border bg-surface px-3 text-[15px] font-medium text-ink transition hover:bg-surface-soft"
        >
          <span>สถานะ/จัดการ</span>
          <IconArrowRight size={17} stroke={2} className="ml-1.5" />
        </Link>
      </div>
    </Card>
  );
}
