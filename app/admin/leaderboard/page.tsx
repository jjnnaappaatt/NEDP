import { LeaderboardView } from "@/components/leaderboard/LeaderboardView";
import { getCurrentMonth } from "@/lib/format";
import { getLeaderboard, getSpeedLeaderboard, getHistoryMonths, getMonthlyHistory } from "@/lib/data";
import type { Standing } from "@/types";

export const dynamic = "force-dynamic";

// Admin views every project without a personal "me"/following highlight — strip those user-scoped cosmetics.
const anon = (arr: Standing[]): Standing[] => arr.map((s) => ({ ...s, isMe: false, isFollowed: false }));

export default async function AdminLeaderboardPage() {
  const current = getCurrentMonth();
  const [standings, speed, historyMonths] = await Promise.all([
    getLeaderboard(current),
    getSpeedLeaderboard(current),
    getHistoryMonths(),
  ]);
  const histories = await Promise.all(historyMonths.map((m) => getMonthlyHistory(m)));
  const historyByMonth: Record<string, Standing[]> = {};
  historyMonths.forEach((m, i) => { historyByMonth[m] = anon(histories[i]); });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="hero-heading hero-heading--wrap">อันดับการส่งข้อมูล</h1>
        <p className="mt-2 text-sm text-ink-soft">ทุกโครงการ · จัดอันดับตามคะแนนการส่งข้อมูลรายเดือน</p>
      </header>
      <LeaderboardView
        current={current}
        standings={anon(standings)}
        speed={anon(speed)}
        historyMonths={historyMonths}
        historyByMonth={historyByMonth}
      />
    </div>
  );
}
