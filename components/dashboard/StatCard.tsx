import { IconBadge } from "@/components/ui/IconBadge";
import type { ComponentType, ReactNode } from "react";

type IconType = ComponentType<{ size?: number; className?: string; stroke?: number }>;

/**
 * KPI stat tile — Mintlify-flat: a plain token card (white/dark) with a brand-colored IconBadge,
 * an ink number, and a label. (No full-card pastel wash, so it reads consistently in dark mode.)
 * `tint` is accepted for call-site compatibility but no longer paints the whole tile.
 */
export function StatCard({
  icon,
  color,
  value,
  label,
  sub,
}: {
  icon: IconType;
  color: string;
  value: ReactNode;
  label: string;
  sub?: ReactNode;
  tint?: string;
}) {
  return (
    <div className="card flex flex-col gap-2.5 p-3.5 animate-fadeUp sm:p-4">
      <IconBadge icon={icon} color={color} size={40} />
      <div className="min-w-0">
        <div className="font-display text-[26px] font-bold leading-none text-ink sm:text-3xl">
          {value}
        </div>
        <div className="mt-1.5 truncate text-sm font-medium text-ink-soft">{label}</div>
        {sub && <div className="mt-0.5 truncate text-sm text-ink-muted">{sub}</div>}
      </div>
    </div>
  );
}
