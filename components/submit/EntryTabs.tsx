"use client";

import { useState } from "react";
import { LocationPanel } from "@/components/forms/LocationPanel";
import { MonthlyGrid, type MonthHistory } from "@/components/manage/MonthlyGrid";
import { MonthlyXlsxCard } from "@/components/submit/MonthlyXlsxCard";
import { IndividualEntry } from "@/components/submit/IndividualEntry";
import { cn } from "@/lib/utils";
import { IconMapPin, IconTable, IconFileSpreadsheet, IconChevronDown } from "@tabler/icons-react";
import type { ProjectLocation, ProjectTemplate } from "@/types";
import type { ProjectAreaTree } from "@/lib/data";

type SubmissionState = { id: string; status: string; data: Record<string, string>; locked: boolean; editRequested: boolean };
type BackupTab = "perlocation" | "grid" | "excel";

// Hidden per request — the aggregate เครื่องมือสำรอง (ทีละพื้นที่/ตาราง/Excel) is kept in the code but not shown.
// Flip to true to bring it back.
const SHOW_BACKUP_TOOLS = false;

/**
 * The ส่งข้อมูล workspace. The MAIN view is "กรอกข้อมูลพื้นที่" (individual per-person entry with the
 * จังหวัด→อำเภอ→ตำบล folder drill-down). The three aggregate modes (ทีละพื้นที่/ตาราง/Excel → the legacy
 * location_submissions pipeline) are kept as a collapsible "สำรอง" backup so nothing is lost.
 */
export function EntryTabs({
  projectId, template, locations, areaTree, doneIds, submissions, hints, canEdit, meName, monthLabel, history,
}: {
  projectId: string;
  template: ProjectTemplate;
  locations: ProjectLocation[];
  areaTree: ProjectAreaTree;
  doneIds: string[];
  submissions: Record<string, SubmissionState>;
  hints: Record<string, Record<string, string>>;
  canEdit: boolean;
  meName: string;
  monthLabel: string;
  history: MonthHistory[];
}) {
  const [tab, setTab] = useState<BackupTab>("perlocation");
  const tabCls = (active: boolean) =>
    cn("flex min-w-[96px] shrink-0 grow items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-medium min-h-[44px] whitespace-nowrap transition",
      active ? "bg-hero text-[var(--on-primary)]" : "text-ink-soft hover:bg-surface");

  return (
    <div className="space-y-5">
      {/* MAIN view */}
      <section className="space-y-3">
        <h2 className="border-l-4 border-accent pl-2 font-display text-base font-semibold text-ink">กรอกข้อมูลพื้นที่</h2>
        <IndividualEntry projectId={projectId} areaTree={areaTree} canEdit={canEdit} />
      </section>

      {/* BACKUP tools — collapsible (hidden behind SHOW_BACKUP_TOOLS; kept in code) */}
      {SHOW_BACKUP_TOOLS && (
      <details className="group rounded-card border border-border bg-surface-soft/40">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-ink-soft [&::-webkit-details-marker]:hidden">
          <span>เครื่องมือสำรอง — ส่งแบบรายพื้นที่ / ตาราง / Excel</span>
          <IconChevronDown size={18} className="shrink-0 transition group-open:rotate-180" />
        </summary>
        <div className="space-y-4 border-t border-border p-3 sm:p-4">
          <div className="flex gap-1 overflow-x-auto rounded-card border border-border bg-surface-soft/60 p-1">
            <button onClick={() => setTab("perlocation")} className={tabCls(tab === "perlocation")}>
              <IconMapPin size={16} /> ทีละพื้นที่
            </button>
            <button onClick={() => setTab("grid")} className={tabCls(tab === "grid")}>
              <IconTable size={16} /> ตาราง
            </button>
            <button onClick={() => setTab("excel")} className={tabCls(tab === "excel")}>
              <IconFileSpreadsheet size={16} /> Excel
            </button>
          </div>

          {tab === "perlocation" && (
            <LocationPanel
              template={template}
              initialLocations={locations}
              initialDoneIds={doneIds}
              initialVerification={null}
              initialAudit={[]}
              meName={meName}
              canEdit={canEdit}
              submissions={submissions}
              hints={hints}
              allowManage={false}
            />
          )}
          {tab === "grid" && (
            <MonthlyGrid
              projectId={projectId}
              locations={locations}
              initial={submissions}
              hints={hints}
              doneIds={doneIds}
              canEdit={canEdit}
              monthLabel={monthLabel}
              history={history}
            />
          )}
          {tab === "excel" && <MonthlyXlsxCard projectId={projectId} canEdit={canEdit} meName={meName} />}
        </div>
      </details>
      )}
    </div>
  );
}
