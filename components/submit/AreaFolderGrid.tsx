import { IconFolder, IconFolderCheck, IconChevronRight, IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import type { AreaStatus, ProjectAreaNode } from "@/lib/data";

const META: Record<AreaStatus, { Icon: typeof IconFolder; iconCls: string; label: string; badgeCls: string }> = {
  complete:    { Icon: IconFolderCheck, iconCls: "text-success-fg", label: "ครบ",        badgeCls: "bg-success-bg text-success-fg" },
  in_progress: { Icon: IconFolder,      iconCls: "text-warning-fg", label: "ไม่ครบ",      badgeCls: "bg-warning-bg text-warning-fg" },
  not_started: { Icon: IconFolder,      iconCls: "text-ink-muted",  label: "ยังไม่เริ่ม", badgeCls: "bg-surface-soft text-ink-soft" },
};

/** Folder cards (จังหวัด/อำเภอ/ตำบล) coloured by completion status with an n_complete/n_enrolled count. */
export function AreaFolderGrid({
  nodes, onSelect, emptyLabel = "ไม่มีข้อมูล",
}: { nodes: ProjectAreaNode[]; onSelect: (n: ProjectAreaNode) => void; emptyLabel?: string }) {
  if (!nodes.length) return <div className="card p-6 text-center text-sm text-ink-soft">{emptyLabel}</div>;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {nodes.map((n) => {
        const m = META[n.status];
        return (
          <button key={n.code} onClick={() => onSelect(n)}
            className="card flex min-h-[56px] items-center gap-3 p-3 text-left transition hover:border-border-accent hover:bg-accent-soft/30">
            <m.Icon size={30} stroke={1.7} className={`shrink-0 ${m.iconCls}`} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-ink">{n.nameTh}</div>
              <div className="mt-0.5 text-xs text-ink-muted">
                {n.nEnrolled > 0 ? `${n.nComplete}/${n.nEnrolled} ครบ` : "ยังไม่มีผู้สูงอายุ"}
              </div>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${m.badgeCls}`}>
              {n.status === "complete" && <IconCheck size={12} />}
              {n.status === "in_progress" && <IconAlertTriangle size={12} />}
              {m.label}
            </span>
            <IconChevronRight size={18} className="shrink-0 text-ink-muted" />
          </button>
        );
      })}
    </div>
  );
}
