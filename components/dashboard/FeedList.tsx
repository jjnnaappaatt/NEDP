import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { shortThaiDate } from "@/lib/utils";
import type { Account, Project } from "@/types";

export interface FeedItem {
  account: Account;
  project: Project;
  points: number;
  submittedAt?: string;
}

/**
 * ฟีด — activity rows for followed accounts who submitted this month.
 * Each row: ★ + avatar + "{name} ส่งข้อมูล {project}" + points badge + short Thai date.
 */
export function FeedList({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-1 p-6 text-center shadow-card">
        <span className="text-2xl">👀</span>
        <p className="text-sm font-medium text-ink-soft">ยังไม่มีความเคลื่อนไหว</p>
        <p className="text-sm text-ink-muted">
          เมื่อคนที่คุณติดตามส่งข้อมูล จะแสดงที่นี่
        </p>
      </div>
    );
  }

  return (
    <ul className="card divide-y divide-border overflow-hidden p-0 shadow-card">
      {items.map((it) => (
        <li
          key={`${it.account.id}-${it.project.id}`}
          className="flex items-center gap-3 p-3 sm:p-3.5"
        >
          <span className="relative shrink-0">
            <Avatar account={it.account} size={40} />
            <span
              className="absolute -right-1 -top-1 text-sm text-gold"
              aria-label="กำลังติดตาม"
            >
              ★
            </span>
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] leading-snug">
              <span className="font-semibold text-ink">{it.account.name}</span>
              <span className="text-ink-soft"> ส่งข้อมูล </span>
            </p>
            <p className="truncate text-sm text-ink-muted">{it.project.name}</p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge className="bg-accent-soft text-ink-accent">+{it.points}</Badge>
            <span className="text-sm text-ink-muted whitespace-nowrap">
              {shortThaiDate(it.submittedAt)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
