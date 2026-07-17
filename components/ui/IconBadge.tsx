import { cn } from "@/lib/utils";
import type { ComponentType } from "react";

/** Circular tinted icon badge — the ขุนทอง rich-menu motif (soft 10% tint + brand-colored icon). */
export function IconBadge({
  icon: Icon,
  color = "#1a56db",
  size = 44,
  className,
}: {
  icon: ComponentType<{ size?: number; className?: string; stroke?: number }>;
  color?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-full", className)}
      style={{ width: size, height: size, background: `${color}1a`, color }}
    >
      <Icon size={Math.round(size * 0.5)} stroke={1.8} />
    </span>
  );
}
