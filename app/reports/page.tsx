import Link from "next/link";
import { IconFolders, IconSend, IconClockCheck, IconTrophy } from "@tabler/icons-react";
import { InnerPageNav } from "@/components/nav/InnerPageNav";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { IconBadge } from "@/components/ui/IconBadge";
import { RawExportCard } from "@/components/reports/RawExportCard";
import { getMyProjects, getLeaderboard, getExportMonths } from "@/lib/data";
import { getCurrentMonth, monthLabelThai } from "@/lib/format";
import { isBundleId, resolveToRealProject } from "@/lib/specialProjects";
import type { SubmissionStatus } from "@/types";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const month = getCurrentMonth();
  const [mineRaw, standings] = await Promise.all([getMyProjects(month), getLeaderboard(month)]);
  // Export/report routes need one real project id — resolve a SMART bundle row to its primary member
  // (which holds the full-copy data), keeping the bundle name for display.
  const mine = mineRaw.map((m) =>
    isBundleId(m.project.id) ? { ...m, project: { ...m.project, id: resolveToRealProject(m.project.id) } } : m,
  );

  // ── User-scoped summary ────────────────────────────────────────
  const myStandings = standings.filter((s) => s.isMe);
  const submittedThisMonth = mine.filter((m) => m.status === "submitted").length;
  const onTime = myStandings.filter((s) => (s.submittedDay ?? 99) <= s.project.deadlineDay).length;
  const myPoints = mine.reduce((acc, m) => acc + (m.points ?? 0), 0);

  const cards = [
    { label: "โครงการของฉัน", value: mine.length, icon: IconFolders, color: "#1a56db" },
    { label: "ส่งแล้วเดือนนี้", value: submittedThisMonth, icon: IconSend, color: "#6d28d9" },
    { label: "ส่งตรงเวลา", value: onTime, icon: IconClockCheck, color: "#16a34a" },
    { label: "คะแนนรวมของฉัน", value: myPoints, icon: IconTrophy, color: "#f59e0b" },
  ];

  // ── Per-project rows (summary list) ────────────────────────────
  const rows = mine.map((m) => ({
    project: m.project,
    points: m.points ?? 0,
    status: m.status as SubmissionStatus | "not_started",
    done: m.locationsDone,
    total: m.locationsTotal,
  }));

  // real month options per project for the raw export picker (users have few projects — cheap)
  const monthsByProject: Record<string, string[]> = Object.fromEntries(
    await Promise.all(mine.map(async (m) => [m.project.id, await getExportMonths(m.project.id)] as const)),
  );

  return (
    <div className="space-y-5">
      <InnerPageNav title="รายงาน" />

      <header>
        <h1 className="hero-heading">รายงานและส่งออกข้อมูล</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {monthLabelThai(month)} · ภาพรวมการส่งข้อมูลของโครงการที่คุณรับผิดชอบ
        </p>
      </header>

      {mine.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-ink-soft">ยังไม่มีโครงการที่ลงทะเบียนไว้</p>
          <Link
            href="/register"
            className="mt-4 inline-block rounded-xl bg-hero px-5 py-2.5 text-sm font-semibold text-[var(--on-primary)]"
          >
            ➕ ลงทะเบียนโครงการ
          </Link>
        </Card>
      ) : (
        <>
          <RawExportCard projects={mine.map((m) => ({ id: m.project.id, name: m.project.name }))}
            monthsByProject={monthsByProject} />

          {/* 1) Summary cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map((c) => (
              <Card key={c.label} className="flex flex-col gap-2 p-3">
                <IconBadge icon={c.icon} color={c.color} size={36} />
                <div className="font-display text-2xl font-bold leading-none text-ink">{c.value}</div>
                <div className="text-[13px] font-medium text-ink-soft">{c.label}</div>
              </Card>
            ))}
          </div>

          {/* 2) Per-project summary — responsive stacked list (no horizontal scroll; long names wrap) */}
          <Card className="p-0">
            <div className="border-b border-border px-4 pb-3 pt-4">
              <h2 className="font-display text-base font-semibold text-ink">สรุปรายโครงการ</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                {monthLabelThai(month)} · ดาวน์โหลดรายงานฉบับเต็ม (PDF / Word) ของแต่ละโครงการ
              </p>
            </div>
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.project.id} className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="break-words text-sm font-semibold text-ink">{r.project.name}</div>
                    <div className="mt-0.5 break-words text-xs text-ink-muted">
                      ผู้รับผิดชอบ: {r.project.researcher || r.project.org || "—"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 lg:shrink-0 lg:justify-end">
                    <div className="flex items-center gap-5">
                      <div className="text-center">
                        <div className="text-xs text-ink-muted">พื้นที่</div>
                        <div className="text-sm font-semibold text-ink-soft">{r.done}/{r.total}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-ink-muted">คะแนน</div>
                        <div className="font-display text-sm font-bold text-ink">{r.points}</div>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={`/api/report/${r.project.id}?format=pdf&month=${month}`} target="_blank" rel="noopener"
                        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-soft">
                        ⬇ PDF
                      </a>
                      <a href={`/api/report/${r.project.id}?format=docx&month=${month}`} target="_blank" rel="noopener"
                        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-soft">
                        ⬇ Word
                      </a>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
