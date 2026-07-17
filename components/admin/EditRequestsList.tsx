"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { IconCheck, IconX, IconCalendarStats, IconMapPin } from "@tabler/icons-react";
import type { EditRequest } from "@/lib/data";

const btn = "inline-flex items-center justify-center gap-1 rounded-card px-3 py-2 text-sm font-medium transition disabled:opacity-50";

function Row({ r, onDone }: { r: EditRequest; onDone: (key: string) => void }) {
  const [busy, setBusy] = useState<null | "approve" | "reject">(null);
  const key = `${r.kind}:${r.id}`;
  async function act(action: "approve" | "reject") {
    setBusy(action);
    const res = await fetch("/api/admin/edit-requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, kind: r.kind, id: r.id }),
    });
    setBusy(null);
    if (res.ok) onDone(key);
  }
  const isMonthly = r.kind === "monthly";
  return (
    <div className="flex items-start justify-between gap-3 rounded-card bg-surface-soft px-3 py-2.5">
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            isMonthly ? "bg-accent-soft text-ink" : "bg-warning-bg text-warning-fg")}>
            {isMonthly ? <IconCalendarStats size={12} /> : <IconMapPin size={12} />}
            {isMonthly ? "ข้อมูลรายเดือน" : "รายการพื้นที่"}
          </span>
          <span className="truncate text-sm font-medium text-ink">{r.projectName}</span>
        </div>
        <div className="truncate text-xs text-ink-soft">
          {r.areaLabel}{r.month ? ` · ${r.month}` : ""}
        </div>
        {r.requesterName && <div className="truncate text-xs text-ink-muted">โดย {r.requesterName}</div>}
      </div>
      <div className="flex shrink-0 gap-1">
        <button onClick={() => act("approve")} disabled={busy !== null} className={cn(btn, "bg-hero text-[var(--on-primary)]")}>
          <IconCheck size={14} /> อนุมัติ
        </button>
        <button onClick={() => act("reject")} disabled={busy !== null} className={cn(btn, "border border-border text-ink-soft hover:bg-surface")}>
          <IconX size={14} />
        </button>
      </div>
    </div>
  );
}

/** Admin queue of pending คำขอแก้ไขข้อมูล — monthly submissions (unlock → draft) + location lists
 *  (unlock the verified list). Approve/reject mirror the head-request flow. */
export function EditRequestsList({ initial }: { initial: EditRequest[] }) {
  const [reqs, setReqs] = useState(initial);
  const remove = (key: string) => setReqs((arr) => arr.filter((x) => `${x.kind}:${x.id}` !== key));

  if (!reqs.length) return null; // hide the whole section when empty

  return (
    <Card className="space-y-2 border-accent/40">
      <h2 className="text-sm font-semibold text-ink">คำขอแก้ไขข้อมูล (หลังยืนยัน) — {reqs.length} รายการ</h2>
      <p className="-mt-1 text-xs text-ink-muted">อนุมัติเพื่อปลดล็อกให้ผู้ใช้แก้ไข · ปฏิเสธเพื่อคงการล็อกไว้</p>
      {reqs.map((r) => <Row key={`${r.kind}:${r.id}`} r={r} onDone={remove} />)}
    </Card>
  );
}
