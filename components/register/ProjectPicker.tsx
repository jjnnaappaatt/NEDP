"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { IconSearch } from "@tabler/icons-react";
import { RegisterButton } from "@/components/register/RegisterButton";
import type { Project } from "@/types";

/** Searchable project list for the register page — fuzzy-filters by name/researcher/org (22+ projects),
 *  then renders each as the existing card + RegisterButton. */
export function ProjectPicker({ projects, registeredIds, canEnroll }: {
  projects: Project[];
  registeredIds: string[];
  canEnroll: boolean;
}) {
  const [q, setQ] = useState("");
  const registered = useMemo(() => new Set(registeredIds), [registeredIds]);
  const fuse = useMemo(
    () => new Fuse(projects, { keys: ["name", "researcher", "org"], threshold: 0.4, ignoreLocation: true }),
    [projects],
  );
  const query = q.trim();
  const list = query ? fuse.search(query).map((r) => r.item) : projects;

  return (
    <div className="space-y-3">
      <div className="relative">
        <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาชื่อโครงการ / ผู้รับผิดชอบ / หน่วยงาน"
          aria-label="ค้นหาโครงการ"
          className="min-h-[44px] w-full rounded-card border border-border bg-surface pl-10 pr-3 text-base text-ink outline-none focus:border-border-accent focus:ring-2 focus:ring-border-accent/30"
        />
      </div>

      {list.length === 0 ? (
        <div className="card p-6 text-center text-sm text-ink-soft">ไม่พบโครงการที่ตรงกับ “{query}”</div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {list.map((p) => (
            <div key={p.id} className="card flex items-center gap-3 p-4">
              <span className="icon-badge text-lg" style={{ background: `${p.accent}1a`, color: p.accent }}>🏥</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-ink">{p.name}</div>
                <div className="truncate text-xs text-ink-soft">ผู้รับผิดชอบ: {p.researcher || p.org || "—"}</div>
              </div>
              <RegisterButton projectId={p.id} registered={registered.has(p.id)} canEnroll={canEnroll} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
