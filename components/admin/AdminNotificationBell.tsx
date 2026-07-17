"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconBell, IconAlertTriangle, IconInbox, IconChevronRight } from "@tabler/icons-react";
import { Sheet } from "@/components/ui/Sheet";
import type { NotificationItem } from "@/lib/data";

/** Admin-portal bell: a digest of work needing action (open issues, pending edit/head requests, overdue
 *  projects). Red dot when anything is high-severity. Mirrors the user-portal NotificationBell. */
export function AdminNotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/notifications");
        const j = await res.json();
        if (!cancelled) { setItems(j.items ?? []); setLoaded(true); }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const hasHigh = items.some((i) => i.severity === "high");
  const go = (href: string) => { setOpen(false); router.push(href); };

  return (
    <>
      <button aria-label="การแจ้งเตือน" onClick={() => setOpen(true)}
        className="relative grid h-11 w-11 place-items-center rounded-full text-ink-soft hover:bg-surface-soft">
        <IconBell size={20} />
        {hasHigh && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger" />}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="การแจ้งเตือน" placement="top-right" closeTone="danger">
        {!loaded ? (
          <p className="py-6 text-center text-sm text-ink-muted">กำลังโหลด…</p>
        ) : !items.length ? (
          <p className="card p-6 text-center text-sm text-ink-soft">ไม่มีรายการที่ต้องดำเนินการ 🎉</p>
        ) : (
          <div className="space-y-1.5">
            {items.map((i) => (
              <button key={i.id} onClick={() => go(i.href)}
                className="card flex w-full items-start gap-2.5 p-3 text-left transition hover:border-border-accent hover:bg-accent-soft/30">
                <span className={`mt-0.5 shrink-0 ${i.severity === "high" ? "text-danger-fg" : "text-ink-muted"}`}>
                  {i.severity === "high" ? <IconAlertTriangle size={18} /> : <IconInbox size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="whitespace-normal text-sm font-medium text-ink [overflow-wrap:anywhere]">{i.message}</div>
                </div>
                <IconChevronRight size={16} className="mt-0.5 shrink-0 text-ink-muted" />
              </button>
            ))}
          </div>
        )}
      </Sheet>
    </>
  );
}
