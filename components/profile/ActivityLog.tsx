import { Card } from "@/components/ui/Card";
import { IconSend, IconDeviceFloppy, IconPencil, IconUserPlus, IconHistory } from "@tabler/icons-react";
import type { ActivityItem } from "@/lib/data";

const ICON = {
  submit: IconSend, draft: IconDeviceFloppy, edit: IconPencil, register: IconUserPlus,
} as const;

/** ISO → "d MMM yyyy(พ.ศ.) HH:mm". */
function fmt(iso: string): string {
  const [date, time] = (iso ?? "").split("T");
  const [y, m, d] = (date ?? "").split("-").map(Number);
  if (!y) return "";
  const MONTHS = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const t = (time ?? "").slice(0, 5);
  return `${d} ${MONTHS[m]} ${y + 543}${t ? ` · ${t} น.` : ""}`;
}

/** A simple timeline of the signed-in user's own actions (submissions, edits, registrations). */
export function ActivityLog({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="space-y-3">
      <h2 className="inline-flex items-center gap-1.5 font-display text-base font-semibold text-ink">
        <IconHistory size={18} /> ประวัติการใช้งาน
      </h2>
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-muted">ยังไม่มีประวัติการใช้งาน</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((it, i) => {
            const Icon = ICON[it.kind] ?? IconHistory;
            return (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-soft text-ink-soft">
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink">{it.label}</div>
                  {it.sub && <div className="text-xs text-ink-soft">{it.sub}</div>}
                  <div className="text-xs text-ink-muted">{fmt(it.when)}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
