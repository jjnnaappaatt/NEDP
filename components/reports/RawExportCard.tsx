"use client";

import { useMemo, useState } from "react";
import { IconFileSpreadsheet, IconDownload } from "@tabler/icons-react";
import { Card } from "@/components/ui/Card";
import { monthLabelThai, CURRENT_MONTH } from "@/lib/format";

const fieldCls =
  "min-h-[44px] w-full rounded-card border border-border bg-surface px-3 text-sm text-ink " +
  "outline-none transition focus:border-border-accent focus:ring-2 focus:ring-border-accent/30";

/** Last 18 months (YYYY-MM, newest first) — fallback month options when real ones aren't provided. */
function genMonths(): string[] {
  const [y0, m0] = CURRENT_MONTH.split("-").map(Number);
  return Array.from({ length: 18 }, (_, i) => {
    const t = y0 * 12 + (m0 - 1) - i;
    return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
  });
}

/**
 * ส่งออกข้อมูลดิบ (raw xlsx) — pick a project (or ทุกโครงการ for admin) + a month (or ทั้งหมด) and
 * download the multi-sheet workbook from /api/export. Codes only; no names in the file. Download is
 * a plain anchor so Content-Disposition drives the save dialog in both LIFF and desktop browsers.
 */
export function RawExportCard({
  projects, monthsByProject, allowAll = false,
}: {
  projects: { id: string; name: string }[];
  monthsByProject?: Record<string, string[]>;
  allowAll?: boolean;
}) {
  const [pid, setPid] = useState(allowAll ? "all" : (projects[0]?.id ?? ""));
  const [month, setMonth] = useState("all");

  const months = useMemo(() => {
    const real = pid !== "all" ? monthsByProject?.[pid] : undefined;
    return real && real.length ? real : genMonths();
  }, [pid, monthsByProject]);

  if (!projects.length && !allowAll) return null;
  const href = pid ? `/api/export/${pid}?month=${month}` : undefined;

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <IconFileSpreadsheet size={20} className="text-accent" />
        <h2 className="font-display text-base font-semibold text-ink">ส่งออกข้อมูลดิบ (Excel)</h2>
      </div>
      <p className="text-xs text-ink-muted">
        คะแนน AAI รายบุคคล · อสม. · รายงานรายพื้นที่ · ทะเบียนผู้เข้าร่วม — เลือกทั้งหมดหรือรายเดือน
        (ไฟล์ใช้รหัสผู้เข้าร่วมแทนชื่อจริง)
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
        <select value={pid} onChange={(e) => { setPid(e.target.value); setMonth("all"); }}
          className={fieldCls} aria-label="เลือกโครงการ">
          {allowAll && <option value="all">ทุกโครงการ</option>}
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(e.target.value)}
          className={`${fieldCls} sm:w-48`} aria-label="เลือกเดือน">
          <option value="all">ทุกเดือน (ทั้งหมด)</option>
          {months.map((m) => <option key={m} value={m}>{monthLabelThai(m)}</option>)}
        </select>
        <a href={href} target="_blank" rel="noopener"
          className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-accent px-5 text-sm
            font-medium text-[var(--on-accent)] transition hover:brightness-105 ${href ? "" : "pointer-events-none opacity-50"}`}>
          <IconDownload size={17} /> ดาวน์โหลด .xlsx
        </a>
      </div>
    </Card>
  );
}
