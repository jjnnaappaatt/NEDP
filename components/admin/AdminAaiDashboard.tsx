"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AaiDashboard } from "@/components/portal/AaiDashboard";
import { Card } from "@/components/ui/Card";
import { ProvinceProjectsPanel } from "./ProvinceProjectsPanel";
import { cn } from "@/lib/utils";
import type { AaiSnapshotRow, GeoNode, PickerProject } from "@/lib/data";

type View = "geo" | "province" | "project";
const VIEWS: [View, string][] = [
  ["geo", "ตามพื้นที่"],
  ["province", "รายจังหวัด"],
  ["project", "รายโครงการ"],
];

/** "รายโครงการ": pick a project → its own dashboard (Overall AAI + 4 มิติ + ความคืบหน้า) at /admin/projects/[id]. */
function ProjectPickerPanel({ projects }: { projects: PickerProject[] }) {
  const router = useRouter();
  const [pid, setPid] = useState("");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="adm-proj" className="text-sm font-medium text-ink-soft">โครงการ</label>
        <select
          id="adm-proj"
          value={pid}
          onChange={(e) => { const v = e.target.value; setPid(v); if (v) router.push(`/admin/projects/${v}`); }}
          className="min-h-[40px] rounded-card border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        >
          <option value="">— เลือกโครงการ —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <Card className="p-8 text-center text-ink-soft">
        เลือกโครงการเพื่อดูคะแนน AAI (Overall + 4 มิติ) และความคืบหน้าเฉพาะโครงการนั้น
      </Card>
    </div>
  );
}

/**
 * Admin AAI dashboard. "ตามพื้นที่" reuses the user dashboard fed with ALL projects — its multi-select
 * already gives both the all-projects overall view and the single-project จังหวัด/อำเภอ/ตำบล drill-down.
 * "รายจังหวัด" is the admin-only cross-project view: pick a province → every project operating there.
 * "รายโครงการ" pins the AAI view to one project (its own /admin/projects/[id] dashboard with progress).
 */
export function AdminAaiDashboard({
  projects, initialRows, provinces,
}: { projects: PickerProject[]; initialRows: AaiSnapshotRow[]; provinces: GeoNode[] }) {
  const [view, setView] = useState<View>("geo");
  return (
    <div className="space-y-5">
      <div className="flex max-w-lg gap-1 rounded-full bg-surface-soft p-1">
        {VIEWS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={cn(
              "min-h-[40px] flex-1 rounded-full px-3 text-sm font-medium transition",
              view === id ? "bg-surface text-ink shadow-card" : "text-ink-soft",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {view === "geo" ? (
        <AaiDashboard projects={projects} initialRows={initialRows} />
      ) : view === "province" ? (
        <ProvinceProjectsPanel provinces={provinces} />
      ) : (
        <ProjectPickerPanel projects={projects} />
      )}
    </div>
  );
}
