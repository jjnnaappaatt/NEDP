import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { SubmissionStatus } from "@/types";

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap", className)}>
      {children}
    </span>
  );
}

const STATUS: Record<string, { label: string; cls: string; mark: string }> = {
  submitted: { label: "ส่งแล้ว", cls: "bg-success-bg text-success-fg", mark: "✓" },
  approved: { label: "อนุมัติแล้ว", cls: "bg-success-bg text-success-fg", mark: "✓" },
  draft: { label: "ฉบับร่าง", cls: "bg-warning-bg text-warning-fg", mark: "⏳" },
  not_started: { label: "ยังไม่ส่ง", cls: "bg-warning-bg text-warning-fg", mark: "⏳" },
  rejected: { label: "ตีกลับ", cls: "bg-danger-bg text-danger-fg", mark: "✕" },
};

export function StatusBadge({ status }: { status: SubmissionStatus | "not_started" }) {
  const s = STATUS[status] ?? STATUS.not_started;
  return <Badge className={s.cls}>{s.mark} {s.label}</Badge>;
}
