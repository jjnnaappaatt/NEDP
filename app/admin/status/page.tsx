import { IconFolders, IconCircleCheck, IconChartBar, IconMapPin } from "@tabler/icons-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { BulkReminderButton } from "@/components/admin/ReminderButtons";
import { LineStatusCheck } from "@/components/admin/LineStatusCheck";
import { ReminderPreview } from "@/components/admin/ReminderPreview";
import { AdminStatusList } from "@/components/admin/AdminStatusList";
import { AdminSummaryExportCard } from "@/components/admin/AdminSummaryExportCard";
import { getOrgDashboardSummary, getAllProjectStatuses, getReminderLog } from "@/lib/data";
import { getCurrentMonth, monthLabelThai } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_CLS: Record<string, string> = {
  sent: "bg-success-bg text-success-fg",
  failed: "bg-danger-bg text-danger-fg",
  skipped: "bg-surface-soft text-ink-muted",
};
const TYPE_LABEL: Record<string, string> = {
  advance: "ล่วงหน้า", due: "ครบกำหนด", overdue: "เกินกำหนด", location: "ยืนยันพื้นที่", manual: "ส่งด้วยตนเอง",
};

/**
 * Admin oversight of monthly-submission progress across ALL projects, now with the reminder controls + log
 * folded in (was the separate แจ้งเตือน page): bulk sends, the daily-cron preview, per-project reminders, and
 * the send history. Read-only aggregates + LINE sends.
 */
export default async function AdminStatusPage() {
  const month = getCurrentMonth();
  const [s, all, log] = await Promise.all([
    getOrgDashboardSummary(month), getAllProjectStatuses(month), getReminderLog(150),
  ]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="hero-heading hero-heading--wrap">สถานะโครงการ — ทั้งหมด</h1>
        <p className="mt-2 text-sm text-ink-soft">{monthLabelThai(month)} · ความคืบหน้า + การแจ้งเตือนผู้รับผิดชอบผ่าน LINE</p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={IconFolders} color="#1a56db" value={s.projectCount} label="โครงการทั้งหมด" />
        <StatCard icon={IconCircleCheck} color="#16a34a" value={`${s.submittedProjects}/${s.projectCount}`} label="ส่งครบทุกพื้นที่" />
        <StatCard icon={IconChartBar} color="#6d28d9" value={`${s.avgCompletionPct}%`} label="ความคืบหน้าเฉลี่ย" />
        <StatCard icon={IconMapPin} color="#d97706" value={s.submittedLocations} label="พื้นที่ส่งแล้วเดือนนี้" sub={`${s.totalAccounts} บัญชีผู้ใช้`} />
      </section>

      <AdminSummaryExportCard />

      {/* การแจ้งเตือน — merged from the former /admin/reminders page */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">ส่งแจ้งเตือนแบบกลุ่ม</h2>
          <LineStatusCheck />
        </div>
        <div className="flex flex-wrap gap-2">
          <BulkReminderButton type="submit" />
          <BulkReminderButton type="location" />
        </div>
        <p className="text-xs text-ink-muted">ส่งไปยังผู้ติดต่อ LINE ของทุกโครงการที่ยังค้าง · ต้องตั้งค่า LINE token ใน Vercel</p>
        <div className="border-t border-border pt-3">
          <div className="mb-1.5 text-xs font-medium text-ink-soft">รอบแจ้งเตือนอัตโนมัติ (รายวัน)</div>
          <ReminderPreview />
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">ความคืบหน้ารายโครงการ</h2>
        <AdminStatusList items={all} />
      </section>

      <details className="group">
        <summary className="cursor-pointer list-none font-display text-lg font-semibold text-ink">
          ประวัติการแจ้งเตือน <span className="text-sm font-normal text-ink-muted">({log.length}) ▾</span>
        </summary>
        <div className="mt-2 space-y-1.5">
          {log.length === 0 ? (
            <Card className="p-8 text-center text-ink-soft">ยังไม่มีประวัติการแจ้งเตือน</Card>
          ) : (
            log.map((e) => (
              <Card key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-ink">{e.projectName}</div>
                  <div className="truncate text-xs text-ink-muted">
                    {TYPE_LABEL[e.reminderType] ?? e.reminderType} · {e.month}
                    {e.recipient ? ` · ${e.recipient.slice(0, 8)}…` : ""}
                    {e.error ? ` · ${e.error}` : ""}
                  </div>
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", STATUS_CLS[e.status] ?? "bg-surface-soft text-ink-soft")}>
                  {e.status}
                </span>
              </Card>
            ))
          )}
        </div>
      </details>
    </div>
  );
}
