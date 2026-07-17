"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { ReminderButtons } from "@/components/admin/ReminderButtons";
import type { OrgProjectStatus } from "@/lib/data";

/** สถานะโครงการ project list with a live search filter (name / ผู้รับผิดชอบ / org). */
export function AdminStatusList({ items }: { items: OrgProjectStatus[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const filtered = query
    ? items.filter(({ project }) => `${project.name} ${project.researcher} ${project.org}`.toLowerCase().includes(query))
    : items;

  return (
    <div className="space-y-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ค้นหาโครงการ / ผู้รับผิดชอบ"
        className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
      />
      {query && <p className="text-xs text-ink-muted">พบ {filtered.length} จาก {items.length} โครงการ</p>}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-ink-soft">ไม่พบโครงการ</Card>
      ) : (
        filtered.map(({ project, locationsDone, locationsTotal, status }) => {
          const pct = locationsTotal ? Math.round((locationsDone / locationsTotal) * 100) : 0;
          return (
            <Card key={project.id} className="space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="line-clamp-2 font-medium text-ink">{project.name}</div>
                  <div className="mt-0.5 truncate text-xs text-ink-muted">
                    ผู้รับผิดชอบ: {project.researcher || project.org || "—"}
                  </div>
                </div>
                <StatusBadge status={status} />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-soft">
                  <div className={`h-full rounded-full ${pct === 100 ? "bg-success" : "bg-accent"}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right text-xs text-ink-muted">{locationsDone}/{locationsTotal} พื้นที่</span>
              </div>
              <div className="border-t border-border pt-2">
                <ReminderButtons projectId={project.id} />
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
