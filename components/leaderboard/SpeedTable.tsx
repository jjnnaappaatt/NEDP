import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import type { Standing } from "@/types";

/** Speed leaderboard — earliest submitters; top-5 get ⚡ (spec §2.3). */
export function SpeedTable({ rows }: { rows: Standing[] }) {
  return (
    <div className="card divide-y divide-border overflow-hidden p-0">
      {rows.map((s, i) => (
        <div
          key={s.account.id + s.project.id}
          className={cn("flex items-center gap-3 px-3 py-2.5", s.isMe && "bg-accent-soft")}
        >
          <div className="w-6 text-center font-display text-base font-bold text-ink-muted">{i < 5 ? "⚡" : s.rank}</div>
          <Avatar account={s.account} size={32} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-ink">{s.account.name}</div>
            <div className="truncate text-xs text-ink-muted">{s.project.name}</div>
          </div>
          <span className="whitespace-nowrap rounded-full bg-success-bg px-2 py-1 text-xs font-medium text-success-fg">
            ส่งภายใน {s.submittedDay ?? "—"} วัน
          </span>
        </div>
      ))}
    </div>
  );
}
