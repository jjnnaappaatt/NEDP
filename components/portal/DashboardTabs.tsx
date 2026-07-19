"use client";

import { useState } from "react";
import { IconChartBar, IconClipboardList } from "@tabler/icons-react";
import { AaiDashboard } from "./AaiDashboard";
import { SurveyDashboard } from "./SurveyDashboard";
import { cn } from "@/lib/utils";
import type { AaiSnapshotRow, PickerProject, ProjectSurveyDashboard } from "@/lib/data";

/**
 * The user's "Dashboard" tab: one place for BOTH the standard AAI-by-area dashboard AND the project's own
 * questionnaire (survey) dashboard, switched by a toggle. The survey side switches project on demand
 * (`/api/portal/survey`). Reused by the SMART bundle (a bundle presents as one PickerProject).
 */
export function DashboardTabs({
  projects, initialAaiRows, initialSurvey, initialSurveyProjectId,
}: {
  projects: PickerProject[];
  initialAaiRows: AaiSnapshotRow[];
  initialSurvey: ProjectSurveyDashboard | null;
  initialSurveyProjectId: string | null;
}) {
  const [tab, setTab] = useState<"aai" | "survey">("aai");
  const [surveyPid, setSurveyPid] = useState(initialSurveyProjectId ?? projects[0]?.id ?? "");
  const [survey, setSurvey] = useState<ProjectSurveyDashboard | null>(initialSurvey);
  const [loading, setLoading] = useState(false);

  const selectSurvey = async (pid: string) => {
    setSurveyPid(pid);
    if (pid === initialSurveyProjectId && initialSurvey) { setSurvey(initialSurvey); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/survey?projectId=${encodeURIComponent(pid)}`);
      setSurvey(res.ok ? ((await res.json()) as ProjectSurveyDashboard) : null);
    } catch { setSurvey(null); } finally { setLoading(false); }
  };

  const surveyName = projects.find((p) => p.id === surveyPid)?.name ?? "";
  const TabBtn = ({ id, label, icon: Icon }: { id: "aai" | "survey"; label: string; icon: typeof IconChartBar }) => (
    <button
      onClick={() => setTab(id)}
      className={cn(
        "flex items-center gap-1.5 rounded-card border px-3.5 py-1.5 text-sm transition",
        tab === id ? "border-accent bg-accent-soft font-semibold text-ink" : "border-border text-ink-soft hover:border-border-accent",
      )}
    >
      <Icon size={16} /> {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <TabBtn id="aai" label="AAI รายพื้นที่" icon={IconChartBar} />
        <TabBtn id="survey" label="แบบสอบถามโครงการ" icon={IconClipboardList} />
      </div>

      {tab === "aai" ? (
        <AaiDashboard projects={projects} initialRows={initialAaiRows} />
      ) : (
        <div className="space-y-4">
          {projects.length > 1 && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-soft">เลือกโครงการ</span>
              <select
                value={surveyPid}
                onChange={(e) => selectSurvey(e.target.value)}
                className="rounded-card border border-border bg-surface px-3 py-2 text-sm text-ink"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          )}
          {loading ? (
            <div className="card p-8 text-center text-ink-soft">กำลังโหลด…</div>
          ) : survey ? (
            <SurveyDashboard projectName={surveyName} data={survey} />
          ) : (
            <div className="card p-8 text-center text-ink-soft">โครงการนี้ยังไม่ได้กำหนดแบบสอบถาม หรือยังไม่มีผล</div>
          )}
        </div>
      )}
    </div>
  );
}
