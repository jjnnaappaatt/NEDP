import { notFound } from "next/navigation";
import Link from "next/link";
import { InnerPageNav } from "@/components/nav/InnerPageNav";
import { HeroHeading } from "@/components/forms/HeroHeading";
import { EntryTabs } from "@/components/submit/EntryTabs";
import { IconClock, IconMapPin, IconClipboardList, IconChevronRight, IconChartBar } from "@tabler/icons-react";
import { getCurrentMonth, monthLabelThai, prevMonth, TODAY } from "@/lib/format";
import {
  getProject, getTemplate, getLocations, getLocationStatuses, isProjectContact, getMe,
  getMyLocationSubmissions, getLatestSubmissionData, getMyMonthlyHistory, getProjectAreaTree,
  getAssignedQuestionnaireInfo,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SubmitProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const [project, template, locs, statuses, canEdit, me, subs, hints, hist, areaTree, qInfo] = await Promise.all([
    getProject(projectId),
    getTemplate(projectId),
    getLocations(projectId),
    getLocationStatuses(projectId),
    isProjectContact(projectId),
    getMe(),
    getMyLocationSubmissions(projectId),
    getLatestSubmissionData(projectId, prevMonth()),
    getMyMonthlyHistory(projectId),
    getProjectAreaTree(projectId),
    getAssignedQuestionnaireInfo(projectId),
  ]);
  if (!project) notFound();

  const month = getCurrentMonth();
  const doneIds = statuses.filter((s) => s.submitted).map((s) => s.location.id);
  const daysLeft = project.deadlineDay - TODAY.day;
  const history = hist.map((h) => ({ ...h, label: monthLabelThai(h.yearMonth) }));

  return (
    <div className="space-y-4">
      <InnerPageNav title="ส่งข้อมูล" />
      <header>
        <HeroHeading wrap>{project.name}</HeroHeading>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
          <span className="inline-flex items-center gap-1"><IconMapPin size={16} stroke={1.8} /> {locs.length} พื้นที่</span>
          <span aria-hidden className="text-ink-muted">·</span>
          <span>รอบ {monthLabelThai(month)}</span>
          <span aria-hidden className="text-ink-muted">·</span>
          <span className={`inline-flex items-center gap-1 font-medium ${daysLeft < 0 ? "text-danger-fg" : daysLeft <= 3 ? "text-warning-fg" : "text-ink-soft"}`}>
            <IconClock size={16} stroke={1.8} /> {daysLeft >= 0 ? `เหลือ ${daysLeft} วัน` : `เลยกำหนด ${-daysLeft} วัน`}
          </span>
        </p>
      </header>

      <Link href={`/integrate/${projectId}`}
        className="flex items-center justify-between gap-2 rounded-card border border-border bg-surface-soft/60 px-4 py-3 text-sm transition hover:bg-surface-soft">
        <span className="flex items-center gap-2 text-ink">
          {qInfo ? (
            <>
              <IconClipboardList size={18} className="shrink-0 text-accent" />
              <span><b>นำเข้าแบบสอบถาม</b></span>
            </>
          ) : (
            <>
              <IconClipboardList size={18} className="shrink-0 text-accent" />
              <span><b>เพิ่มแบบสอบถามของโครงการ</b> (JSON) พร้อมคู่มือ</span>
            </>
          )}
        </span>
        <IconChevronRight size={16} className="shrink-0 text-ink-muted" />
      </Link>

      {qInfo && (
        <Link href={`/portal/projects/${projectId}/survey`}
          className="flex items-center justify-between gap-2 rounded-card border border-border bg-surface-soft/60 px-4 py-3 text-sm transition hover:bg-surface-soft">
          <span className="flex items-center gap-2 text-ink">
            <IconChartBar size={18} className="shrink-0 text-accent" />
            <span><b>แดชบอร์ดแบบสอบถามของโครงการ</b> — สรุปผลรวมของโครงการ</span>
          </span>
          <IconChevronRight size={16} className="shrink-0 text-ink-muted" />
        </Link>
      )}

      <EntryTabs
        projectId={projectId}
        template={template}
        locations={locs}
        areaTree={areaTree}
        doneIds={doneIds}
        submissions={Object.fromEntries(subs)}
        hints={Object.fromEntries(hints)}
        canEdit={canEdit}
        meName={me.name}
        monthLabel={monthLabelThai(month)}
        history={history}
      />
    </div>
  );
}
