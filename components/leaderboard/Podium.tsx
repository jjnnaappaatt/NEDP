import { Avatar } from "@/components/ui/Avatar";
import { CountUp } from "./CountUp";
import { AmbientHeroMount } from "@/components/three/AmbientHeroMount";
import { cn } from "@/lib/utils";
import type { Standing } from "@/types";

const MEDAL = ["🥇", "🥈", "🥉"];
const PILLAR = ["h-24", "h-16", "h-12"]; // 1st, 2nd, 3rd
const RING = ["ring-gold", "ring-silver", "ring-bronze"];

function Spot({ s, place }: { s: Standing; place: 0 | 1 | 2 }) {
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col items-center", place === 0 ? "-mt-2" : "mt-4")}>
      <div className="text-2xl leading-none">{MEDAL[place]}</div>
      <div className={cn("relative mt-1 rounded-full ring-4", RING[place])}>
        <Avatar account={s.account} size={place === 0 ? 60 : 48} />
        {s.isFollowed && <span className="absolute -right-1 -top-1 text-sm">★</span>}
      </div>
      <div className="mt-2 w-full truncate px-1 text-center text-sm font-semibold text-white">{s.account.name}</div>
      <div className="w-full truncate px-1 text-center text-xs text-white/85">{s.account.org}</div>
      <div className="mt-0.5 font-display text-lg font-bold text-white">
        <CountUp value={s.totalPoints} /> <span className="text-[13px] font-normal text-white/80">pts</span>
      </div>
      <div className={cn("mt-2 flex w-full items-start justify-center rounded-t-xl bg-white/20 pt-1.5 font-display text-xl font-bold text-white", PILLAR[place])}>
        {place + 1}
      </div>
    </div>
  );
}

/** Kahoot-style podium — 1st centered + elevated, 2nd/3rd flanking (spec §2.3). */
export function Podium({ top3 }: { top3: Standing[] }) {
  const [first, second, third] = top3;
  return (
    <div className="relative overflow-hidden rounded-card bg-gradient-to-b from-[#0f3a34] to-[#1c5a4f] p-4 shadow-podium sm:p-6">
      <AmbientHeroMount color="#34d399" particle="#5eead4" density={170} />
      <div className="relative flex items-end justify-center gap-1.5 sm:gap-3">
        {second && <Spot s={second} place={1} />}
        {first && <Spot s={first} place={0} />}
        {third && <Spot s={third} place={2} />}
      </div>
    </div>
  );
}
