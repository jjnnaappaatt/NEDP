"use client";

import {
  IconUserPlus, IconClipboardCheck, IconTrash, IconSend, IconPencil,
  IconMapPin, IconCircleCheck, IconHeart, IconMailQuestion,
} from "@tabler/icons-react";
import type { ProjectActivityItem, ProjectActivityAction } from "@/lib/data/sb/activity";

const META: Record<ProjectActivityAction, { label: string; Icon: typeof IconUserPlus; cls: string }> = {
  enroll:       { label: "ลงทะเบียนผู้สูงอายุ",   Icon: IconUserPlus,       cls: "bg-accent-soft text-ink-accent" },
  assess:       { label: "บันทึกคะแนน AAI",       Icon: IconClipboardCheck, cls: "bg-accent-soft text-ink-accent" },
  purge:        { label: "ลบข้อมูลบุคคล (ถาวร)",  Icon: IconTrash,          cls: "bg-danger-bg text-danger-fg" },
  submit:       { label: "ส่งข้อมูลรายพื้นที่",     Icon: IconSend,           cls: "bg-success-bg text-success-fg" },
  draft:        { label: "บันทึกร่าง",             Icon: IconPencil,         cls: "bg-surface-soft text-ink-soft" },
  edit_request: { label: "ขอแก้ไขข้อมูล",          Icon: IconMailQuestion,   cls: "bg-warning-bg text-warning-fg" },
  loc_edit:     { label: "แก้ไขพื้นที่",            Icon: IconMapPin,         cls: "bg-warning-bg text-warning-fg" },
  verify:       { label: "ยืนยันพื้นที่",           Icon: IconCircleCheck,    cls: "bg-success-bg text-success-fg" },
  osm:          { label: "บันทึกจำนวน อสม.",       Icon: IconHeart,          cls: "bg-accent-soft text-ink-accent" },
};

function whenTh(iso: string): string {
  const [d, t] = iso.split("T");
  const [y, m, day] = (d ?? "").split("-").map(Number);
  if (!y) return "";
  return `${day}/${m}/${(y + 543) % 100} ${t ? t.slice(0, 5) + " น." : ""}`.trim();
}

/** Chief-only feed of member actions (who · did what · to which record · when), newest first. */
export function ActivityFeed({ items }: { items: ProjectActivityItem[] }) {
  if (!items.length) {
    return <div className="card p-6 text-center text-sm text-ink-soft">ยังไม่มีกิจกรรมในโครงการนี้</div>;
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((it, i) => {
        const m = META[it.action];
        return (
          <li key={`${it.when}-${i}`} className="flex items-start gap-3 py-2.5">
            <span className={`icon-badge mt-0.5 shrink-0 ${m.cls}`} style={{ width: 36, height: 36 }}>
              <m.Icon size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-ink">
                <span className="font-medium">{it.whoName}</span>
                <span className="text-ink-soft"> · {m.label}</span>
                {it.targetLabel && <span className="font-medium"> · {it.targetLabel}</span>}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                {it.detail && <span className="break-words">{it.detail}</span>}
                <span className="whitespace-nowrap">{whenTh(it.when)}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
