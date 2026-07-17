"use client";

import { useState } from "react";
import { Podium } from "@/components/leaderboard/Podium";
import { RankTable } from "@/components/leaderboard/RankTable";
import { SpeedTable } from "@/components/leaderboard/SpeedTable";
import { MonthSelector } from "@/components/leaderboard/MonthSelector";
import { monthLabelThai } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Standing } from "@/types";

type Tab = "current" | "history" | "speed";

// Last-month sample ranking seeded by the admin demo data — clearly flagged so members never mistake
// it for real standings; removed when the admin runs "ล้างข้อมูลตัวอย่าง".
const DEMO_MONTH = "2026-05";

export function LeaderboardView({
  current,
  standings,
  speed,
  historyMonths,
  historyByMonth,
}: {
  current: string;
  standings: Standing[];
  speed: Standing[];
  historyMonths: string[];
  historyByMonth: Record<string, Standing[]>;
}) {
  const [tab, setTab] = useState<Tab>("current");
  const [histMonth, setHistMonth] = useState(historyMonths[0]);
  const hist = historyByMonth[histMonth] ?? [];

  const tabs: { k: Tab; label: string }[] = [
    { k: "current", label: "เดือนนี้" },
    { k: "history", label: "ย้อนหลัง" },
    { k: "speed", label: "ส่งเร็วที่สุด" },
  ];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="hero-heading">🏆 อันดับการส่งข้อมูล</h1>
        <p className="mt-2 text-sm text-ink-soft">{monthLabelThai(current)} · ส่งก่อน ครบ และเร็ว = คะแนนสูงสุด</p>
      </header>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-card border px-2 py-2 text-sm font-medium min-h-11",
              tab === t.k ? "border-accent bg-accent-soft text-ink-accent" : "border-border bg-surface text-ink-soft",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "current" && (
        <div className="space-y-4">
          {standings.length === 0 && historyMonths.includes(DEMO_MONTH) && (
            <button
              onClick={() => { setTab("history"); setHistMonth(DEMO_MONTH); }}
              className="flex w-full items-center justify-between gap-2 rounded-card border border-accent/40 bg-accent-soft px-4 py-3 text-left"
            >
              <span className="text-sm font-medium text-ink-accent">
                🏆 ดูตัวอย่างอันดับเดือนพฤษภาคม
                <span className="ml-1.5 rounded-full bg-warning-bg px-2 py-0.5 text-xs font-semibold text-warning-fg">ข้อมูลสาธิต</span>
              </span>
              <span aria-hidden className="text-lg text-ink-accent">→</span>
            </button>
          )}
          <Podium top3={standings.slice(0, 3)} />
          <RankTable rows={standings} from={4} />
        </div>
      )}

      {tab === "speed" && <SpeedTable rows={speed} />}

      {tab === "history" && (
        <div className="space-y-4">
          <MonthSelector months={historyMonths} value={histMonth} onChange={setHistMonth} labelOf={monthLabelThai} />
          {histMonth === DEMO_MONTH && (
            <div className="rounded-card border border-warning/40 bg-warning-bg px-3 py-2 text-xs leading-relaxed text-warning-fg">
              <b>ข้อมูลสาธิต</b> — ตัวอย่างอันดับเดือนที่แล้ว เพื่อให้เห็นหน้าตาระบบ · ผู้ดูแลลบได้เมื่อเริ่มใช้งานจริง
            </div>
          )}
          <Podium top3={hist.slice(0, 3)} />
          <RankTable rows={hist} from={4} />
        </div>
      )}
    </div>
  );
}
