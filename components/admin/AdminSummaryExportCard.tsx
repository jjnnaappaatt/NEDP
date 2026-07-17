"use client";

import { useState } from "react";
import { IconFileSpreadsheet, IconDownload } from "@tabler/icons-react";
import { Card } from "@/components/ui/Card";
import { monthLabelThai, CURRENT_MONTH } from "@/lib/format";

const fieldCls =
  "min-h-[44px] w-full rounded-card border border-border bg-surface px-3 text-sm text-ink " +
  "outline-none transition focus:border-border-accent focus:ring-2 focus:ring-border-accent/30";

/** Last 12 months (YYYY-MM, newest first). */
function genMonths(): string[] {
  const [y0, m0] = CURRENT_MONTH.split("-").map(Number);
  return Array.from({ length: 12 }, (_, i) => {
    const t = y0 * 12 + (m0 - 1) - i;
    return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
  });
}

/**
 * ส่งออกสรุป AAI รายโครงการ (admin) — one row per project: submission progress + Overall AAI + D1–D4.
 * No per-person data. Replaces the former raw all-projects export on the admin surface. Plain anchor so
 * Content-Disposition drives the save dialog in both LIFF and desktop browsers.
 */
export function AdminSummaryExportCard() {
  const [month, setMonth] = useState(CURRENT_MONTH);
  const href = `/api/export/admin-summary?month=${month}`;

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <IconFileSpreadsheet size={20} className="text-accent" />
        <h2 className="font-display text-base font-semibold text-ink">ส่งออกสรุป AAI รายโครงการ (Excel)</h2>
      </div>
      <p className="text-xs text-ink-muted">
        หนึ่งแถวต่อโครงการ · ความคืบหน้าการส่งข้อมูล + คะแนน AAI ภาพรวม (Overall + 4 มิติ) —
        ไม่มีข้อมูลรายบุคคลหรือคำตอบรายข้อ
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <select value={month} onChange={(e) => setMonth(e.target.value)} className={fieldCls} aria-label="เลือกเดือน">
          {genMonths().map((m) => <option key={m} value={m}>{monthLabelThai(m)}</option>)}
        </select>
        <a href={href} target="_blank" rel="noopener"
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-accent px-5 text-sm
            font-medium text-[var(--on-accent)] transition hover:brightness-105">
          <IconDownload size={17} /> ดาวน์โหลด .xlsx
        </a>
      </div>
    </Card>
  );
}
