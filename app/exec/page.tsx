import Link from "next/link";
import { IconFolders, IconCircleCheck, IconChartBar, IconMapPin } from "@tabler/icons-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Podium } from "@/components/leaderboard/Podium";
import { RankTable } from "@/components/leaderboard/RankTable";
import {
  getOrgDashboardSummary, getAllProjectStatuses, getDimensionSummary, getLeaderboard,
} from "@/lib/data";
import { getCurrentMonth, monthLabelThai } from "@/lib/format";
import { MONTHLY_SECTIONS } from "@/lib/forms/monthlyReport";
import { AmbientHeroMount } from "@/components/three/AmbientHeroMount";
import { CountUp } from "@/components/manual/motion";

export const dynamic = "force-dynamic";

/**
 * Public executive dashboard — org-wide aggregates across ALL projects (distinct from the user-centric
 * /dashboard). Reached from the Railway admin portal's "เปิดแดชบอร์ด" button. Rendered in ONE server
 * pass (NO <Suspense> streaming): the LINE/iOS WebView won't paint streamed-in content until you tap,
 * so the four aggregate fns are awaited up front (one parallel batch) and the complete page paints on
 * load.
 */
export default async function ExecPage() {
  const month = getCurrentMonth();
  const [s, standings, dims, all] = await Promise.all([
    getOrgDashboardSummary(month),
    getLeaderboard(month),
    getDimensionSummary(month),
    getAllProjectStatuses(month),
  ]);
  const meta = MONTHLY_SECTIONS.find((x) => x.title.includes("รายมิติ"))?.indicators ?? [];
  const metaOf = (key: string) => meta.find((i) => i.afterKey === `${key}_after`);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-card border border-border bg-[var(--surface-1)] px-5 py-6 shadow-card sm:min-h-[160px]">
        <AmbientHeroMount color="#00d4a4" particle="#00b48a" />
        <header className="relative">
          <h1 className="hero-heading">แดชบอร์ดผู้บริหาร</h1>
          <p className="mt-2 text-sm text-ink-soft">{monthLabelThai(month)} · ภาพรวมทุกโครงการในระบบ</p>
        </header>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={IconFolders} color="#1a56db" value={<CountUp value={s.projectCount} />} label="โครงการทั้งหมด" />
        <StatCard icon={IconCircleCheck} color="#16a34a" value={`${s.submittedProjects}/${s.projectCount}`} label="ส่งครบทุกพื้นที่" />
        <StatCard icon={IconChartBar} color="#6d28d9" value={<><CountUp value={s.avgCompletionPct} />%</>} label="ความคืบหน้าเฉลี่ย" />
        <StatCard icon={IconMapPin} color="#d97706" value={<CountUp value={s.submittedLocations} />} label="พื้นที่ส่งแล้วเดือนนี้" sub={`${s.totalAccounts} บัญชีผู้ใช้`} />
      </section>

      {/* Standings */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">อันดับโครงการ</h2>
        {standings.length === 0 ? (
          <Card className="p-8 text-center text-ink-soft">ยังไม่มีโครงการส่งข้อมูลเดือนนี้</Card>
        ) : (
          <>
            <Podium top3={standings.slice(0, 3)} />
            <RankTable rows={standings} from={4} />
          </>
        )}
      </section>

      {/* AAI dimensions */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="border-l-4 border-accent pl-2 font-display text-base font-semibold text-ink">
            คะแนน AAI รายมิติ (เฉลี่ยทุกพื้นที่)
          </h2>
          <Link href="/exec/tambon" className="whitespace-nowrap text-xs font-medium text-accent hover:underline">
            ดูรายตำบล →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {dims.map((d) => {
            const m = metaOf(d.key);
            const delta = d.before != null && d.after != null ? Math.round((d.after - d.before) * 10) / 10 : null;
            return (
              <div key={d.key} className="rounded-card border border-border p-3">
                <div className="text-sm font-medium text-ink">{m?.label ?? d.key}</div>
                {m?.desc && <div className="mt-0.5 text-xs leading-relaxed text-ink-muted">{m.desc}</div>}
                <div className="mt-2 flex items-end gap-3">
                  <div>
                    <div className="text-xs text-ink-muted">ก่อน</div>
                    <div className="font-display text-lg font-bold text-ink-soft">{d.before ?? "—"}</div>
                  </div>
                  <div className="pb-1 text-ink-muted">→</div>
                  <div>
                    <div className="text-xs text-ink-muted">หลัง</div>
                    <div className="font-display text-xl font-bold text-ink">{d.after ?? "—"}</div>
                  </div>
                  {delta != null && (
                    <div className={`ml-auto pb-1 text-sm font-semibold ${delta >= 0 ? "text-success-fg" : "text-danger-fg"}`}>
                      {delta >= 0 ? `+${delta}` : delta}
                    </div>
                  )}
                </div>
                <div className="mt-1 text-xs text-ink-muted">{d.count} พื้นที่ที่ส่งแล้ว</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Per-project completion */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">ความคืบหน้ารายโครงการ</h2>
        <div className="space-y-2">
          {all.map(({ project, locationsDone, locationsTotal, status }) => {
            const pct = locationsTotal ? Math.round((locationsDone / locationsTotal) * 100) : 0;
            return (
              <Card key={project.id} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="line-clamp-2 font-medium text-ink">{project.name}</div>
                    <div className="mt-0.5 truncate text-xs text-ink-muted">ผู้รับผิดชอบ: {project.researcher || project.org || "—"}</div>
                  </div>
                  <StatusBadge status={status} />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-soft">
                    <div className={`h-full rounded-full ${pct === 100 ? "bg-success" : "bg-accent"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="whitespace-nowrap text-xs font-medium text-ink-soft">{locationsDone}/{locationsTotal} พื้นที่</span>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
