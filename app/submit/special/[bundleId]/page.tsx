import { notFound } from "next/navigation";
import { InnerPageNav } from "@/components/nav/InnerPageNav";
import { HeroHeading } from "@/components/forms/HeroHeading";
import { EntryTabs } from "@/components/submit/EntryTabs";
import { IconInfoCircle } from "@tabler/icons-react";
import { getCurrentMonth, monthLabelThai, prevMonth } from "@/lib/format";
import {
  getProject, getTemplate, getLocations, getLocationStatuses, isProjectContact, getMe,
  getMyLocationSubmissions, getLatestSubmissionData, getMyMonthlyHistory, getProjectAreaTree,
} from "@/lib/data";
import { bundleById } from "@/lib/specialProjects";

export const dynamic = "force-dynamic";

/**
 * SMART merged entry: one full-screening surface for a user registered to BOTH member projects. The UI is
 * the PRIMARY member's normal entry; each per-person questionnaire submit is mirrored to all members
 * (bundleId prop → /api/special/submit). Only reachable by a contact of EVERY member project.
 */
export default async function SpecialSubmitPage({ params }: { params: Promise<{ bundleId: string }> }) {
  const { bundleId } = await params;
  const bundle = bundleById(bundleId);
  if (!bundle) notFound();

  const contacts = await Promise.all(bundle.memberIds.map((m) => isProjectContact(m)));
  if (!contacts.every(Boolean)) notFound();

  const primaryId = bundle.memberIds[0];
  const [project, template, locs, statuses, me, subs, hints, areaTree, histRaw] = await Promise.all([
    getProject(primaryId),
    getTemplate(primaryId),
    getLocations(primaryId),
    getLocationStatuses(primaryId),
    getMe(),
    getMyLocationSubmissions(primaryId),
    getLatestSubmissionData(primaryId, prevMonth()),
    getProjectAreaTree(primaryId),
    getMyMonthlyHistory(primaryId),
  ]);
  if (!project) notFound();

  const month = getCurrentMonth();
  const doneIds = statuses.filter((s) => s.submitted).map((s) => s.location.id);
  const history = histRaw.map((x) => ({ ...x, label: monthLabelThai(x.yearMonth) }));

  return (
    <div className="space-y-4">
      <InnerPageNav title="ส่งข้อมูล — SMART" />
      <header>
        <HeroHeading wrap>{bundle.name}</HeroHeading>
        <p className="mt-2 text-sm text-ink-soft">รอบ {monthLabelThai(month)}</p>
      </header>

      <div className="flex items-start gap-2 rounded-card border border-accent/40 bg-accent-soft/40 p-3 text-sm text-ink">
        <IconInfoCircle size={18} className="mt-0.5 shrink-0 text-accent" />
        <span>
          กรอกแบบคัดกรองครบทั้ง 3 ด้าน (หกล้ม · กระดูก · โภชนาการ) เพียงครั้งเดียว — ระบบจะบันทึกข้อมูลเข้าทั้ง 2 โครงการโดยอัตโนมัติ
        </span>
      </div>

      <EntryTabs
        projectId={primaryId}
        template={template}
        locations={locs}
        areaTree={areaTree}
        doneIds={doneIds}
        submissions={Object.fromEntries(subs)}
        hints={Object.fromEntries(hints)}
        canEdit
        meName={me.name}
        monthLabel={monthLabelThai(month)}
        history={history}
        bundleId={bundle.id}
      />
    </div>
  );
}
