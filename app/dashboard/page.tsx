import Link from "next/link";
import {
  IconFolders,
  IconCircleCheck,
  IconTrophy,
  IconClockHour4,
  IconFilePencil,
  IconChevronRight,
} from "@tabler/icons-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProjectStatusCard } from "@/components/status/ProjectStatusCard";
import { Button } from "@/components/ui/Button";
import { AmbientHeroMount } from "@/components/three/AmbientHeroMount";
import { CountUp } from "@/components/manual/motion";
import { getDashboardSummary, getMyProjects, getMe } from "@/lib/data";
import { getCurrentMonth, monthLabelThai } from "@/lib/format";

export const dynamic = "force-dynamic";

// Rendered in ONE server pass (no <Suspense> streaming): the LINE/iOS WebView would not paint
// streamed-in content until you tapped. All data is awaited up front (getDashboardSummary is already
// one parallel batch; getMyProjects is cache()-deduped) so the complete page paints on load.
export default async function DashboardPage() {
  const month = getCurrentMonth();
  const [me, summary, mine] = await Promise.all([
    getMe(),
    getDashboardSummary(month),
    getMyProjects(month),
  ]);
  const submittedCount = mine.filter((m) => m.status === "submitted").length;
  const deadlineProject = summary.nextDeadlineProject;

  return (
    <div className="space-y-6">
      {/* 1) Greeting hero — subtle ambient 3D behind on desktop; a static mint glow on mobile/reduced-motion */}
      <div className="relative overflow-hidden rounded-card border border-border bg-[var(--surface-1)] px-5 py-6 shadow-card sm:min-h-[160px]">
        <AmbientHeroMount />
        <header className="relative">
          <p className="text-sm font-medium text-ink-muted">{monthLabelThai(month)}</p>
          <h1 className="mt-0.5 font-display text-[28px] font-bold leading-snug text-ink sm:text-4xl">
            สวัสดี {me.name}
          </h1>
          <p className="mt-1 text-[15px] text-ink-soft">
            โครงการที่คุณรับผิดชอบ และสถานะการส่งข้อมูลประจำเดือนนี้
          </p>
        </header>
      </div>

      {/* 2) KPI strip */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={IconFolders} color="#1a56db" tint="#eff4ff" value={<CountUp value={mine.length} />} label="โครงการของฉัน" />
        <StatCard icon={IconCircleCheck} color="#16a34a" tint="#ecfdf3" value={`${submittedCount}/${mine.length}`} label="ส่งครบเดือนนี้" />
        <StatCard
          icon={IconTrophy} color="#6d28d9" tint="#f4f1fe"
          value={summary.myRank ? `#${summary.myRank}` : "—"} label="อันดับของฉัน" sub={`${summary.myPoints} คะแนน`}
        />
        <StatCard
          icon={IconClockHour4} color="#d97706" tint="#fff8eb"
          value={deadlineProject ? `${summary.nextDeadlineDays} วัน` : "—"} label="เหลือเวลาส่ง"
          sub={deadlineProject ? deadlineProject.name : "เลยกำหนดเดือนนี้แล้ว"}
        />
      </section>

      {/* 3) My projects */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-ink">โครงการของฉัน</h2>
          <Link href="/register" className="whitespace-nowrap text-[13px] font-medium text-ink-accent">
            + ลงทะเบียนเพิ่ม
          </Link>
        </div>
        {mine.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-ink-soft">ยังไม่มีโครงการที่ลงทะเบียนไว้</p>
            <Link href="/register" className="mt-4 inline-block rounded-xl bg-hero px-5 py-2.5 text-sm font-semibold text-[var(--on-primary)]">
              ➕ ลงทะเบียนโครงการ
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {mine.map((item) => (
              <ProjectStatusCard key={item.project.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* 4) Quick links */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href="/submit" className="block">
          <Button variant="primary" className="w-full justify-between">
            <span className="inline-flex items-center gap-2">
              <IconFilePencil size={20} stroke={1.8} />
              ส่งข้อมูล
            </span>
            <IconChevronRight size={20} stroke={1.8} />
          </Button>
        </Link>
        <Link href="/leaderboard" className="block">
          <Button variant="accent" className="w-full justify-between">
            <span className="inline-flex items-center gap-2">
              <IconTrophy size={20} stroke={1.8} />
              ดูอันดับ
            </span>
            <IconChevronRight size={20} stroke={1.8} />
          </Button>
        </Link>
      </section>
    </div>
  );
}
