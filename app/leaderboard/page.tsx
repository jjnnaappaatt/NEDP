import { LeaderboardView } from "@/components/leaderboard/LeaderboardView";
import { getCurrentMonth } from "@/lib/format";
import { getLeaderboard, getSpeedLeaderboard, getHistoryMonths, getMonthlyHistory } from "@/lib/data";
import type { Standing } from "@/types";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const current = getCurrentMonth();
  const [standings, speed, historyMonths] = await Promise.all([
    getLeaderboard(current),
    getSpeedLeaderboard(current),
    getHistoryMonths(),
  ]);

  const histories = await Promise.all(historyMonths.map((m) => getMonthlyHistory(m)));
  const historyByMonth: Record<string, Standing[]> = {};
  historyMonths.forEach((m, i) => {
    historyByMonth[m] = histories[i];
  });

  return (
    <LeaderboardView
      current={current}
      standings={standings}
      speed={speed}
      historyMonths={historyMonths}
      historyByMonth={historyByMonth}
    />
  );
}
