"use client";

import { cn } from "@/lib/utils";

/** Pill tabs for the history month timeline (spec §2.3 history view). */
export function MonthSelector({
  months,
  value,
  onChange,
  labelOf,
}: {
  months: string[];
  value: string;
  onChange: (m: string) => void;
  labelOf: (m: string) => string;
}) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
      {months.map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={cn(
            "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium min-h-11",
            m === value ? "border-accent bg-accent text-[var(--on-accent)]" : "border-border bg-surface text-ink-soft",
          )}
        >
          {labelOf(m)}
        </button>
      ))}
    </div>
  );
}
