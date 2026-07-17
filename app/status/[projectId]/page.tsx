import { notFound } from "next/navigation";
import { InnerPageNav } from "@/components/nav/InnerPageNav";
import { HeroHeading } from "@/components/forms/HeroHeading";
import { StatusManageHub } from "@/components/status/StatusManageHub";
import { TeamSection } from "@/components/project/TeamSection";
import { IconClock, IconMapPin } from "@tabler/icons-react";
import { getCurrentMonth, monthLabelThai, TODAY } from "@/lib/format";
import {
  getProject, getLocations, getLocationStatuses, getLocationVerification, getMe,
  getLocationAudit, isProjectContact, getMyLocationSubmissions, getMyMonthlyHistory, getProjectTeam,
  canSeeTeamActivity, getProjectActivity,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function StatusHubPage({
  params, searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ confirm?: string }>;
}) {
  const { projectId } = await params;
  const { confirm } = await searchParams;

  const [project, locs, statuses, verification, audit, canEdit, me, submissions, hist, team, isChief] = await Promise.all([
    getProject(projectId),
    getLocations(projectId),
    getLocationStatuses(projectId),
    getLocationVerification(projectId),
    getLocationAudit(projectId),
    isProjectContact(projectId),
    getMe(),
    getMyLocationSubmissions(projectId),
    getMyMonthlyHistory(projectId),
    getProjectTeam(projectId),
    canSeeTeamActivity(projectId),
  ]);
  if (!project) notFound();
  const activity = isChief ? await getProjectActivity(projectId) : undefined;

  const month = getCurrentMonth();
  const daysLeft = project.deadlineDay - TODAY.day;
  const doneIds = statuses.filter((l) => l.submitted).map((l) => l.location.id);
  const history = hist.map((h) => ({ ...h, label: monthLabelThai(h.yearMonth) }));

  return (
    <div className="space-y-4">
      <InnerPageNav title="สถานะ / จัดการ" />

      <header>
        <HeroHeading wrap>{project.name}</HeroHeading>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
          <span className="whitespace-nowrap">รอบ {monthLabelThai(month)}</span>
          <span aria-hidden className="text-ink-muted">·</span>
          <span className="inline-flex items-center gap-1 whitespace-nowrap"><IconMapPin size={16} stroke={1.8} /> {locs.length} พื้นที่</span>
          <span aria-hidden className="text-ink-muted">·</span>
          <span className={`inline-flex items-center gap-1 whitespace-nowrap font-medium ${
            daysLeft < 0 ? "text-danger-fg" : daysLeft <= 3 ? "text-warning-fg" : "text-ink-soft"
          }`}>
            <IconClock size={16} stroke={1.8} />
            {daysLeft >= 0 ? `เหลือ ${daysLeft} วัน` : `เลยกำหนด ${-daysLeft} วัน`}
          </span>
        </p>
      </header>

      <StatusManageHub
        projectId={projectId}
        projectName={project.name}
        locations={locs}
        doneIds={doneIds}
        submissions={Object.fromEntries(submissions)}
        verification={verification}
        audit={audit}
        meName={me.name}
        canEdit={canEdit}
        history={history}
        startManage={confirm === "1"}
        activity={activity}
      />

      <TeamSection projectId={projectId} team={team} />
    </div>
  );
}
