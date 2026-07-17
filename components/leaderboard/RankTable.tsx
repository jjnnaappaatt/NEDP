import { Avatar } from "@/components/ui/Avatar";
import { cn, shortThaiDate } from "@/lib/utils";
import type { Standing } from "@/types";

/** Ranked rows 4..N — "me" highlighted, followed accounts get ★ (spec §2.3 / §6.2). */
export function RankTable({ rows, from = 4 }: { rows: Standing[]; from?: number }) {
  const list = rows.filter((r) => r.rank >= from);
  if (!list.length) return null;
  return (
    <div className="card divide-y divide-border overflow-hidden p-0">
      {list.map((s) => (
        <div
          key={s.account.id + s.project.id}
          className={cn("flex items-center gap-3 px-3 py-2.5", s.isMe && "bg-accent-soft")}
        >
          <div className="w-6 text-center font-display font-bold text-ink-muted">{s.rank}</div>
          <Avatar account={s.account} size={32} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-sm font-medium text-ink">
              {s.isFollowed && <span className="text-gold">★</span>}
              <span className="truncate">{s.account.name}</span>
              {s.isMe && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[13px] font-semibold text-[var(--on-accent)]">คุณ</span>}
            </div>
            <div className="truncate text-xs text-ink-muted">{s.project.name}</div>
          </div>
          <div className="text-right">
            <div className="font-display font-bold text-ink">{s.totalPoints}</div>
            <div className="text-[13px] text-ink-muted whitespace-nowrap">{shortThaiDate(s.submittedAt)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
