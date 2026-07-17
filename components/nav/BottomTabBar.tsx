"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconDots } from "@tabler/icons-react";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/Sheet";

export function BottomTabBar() {
  const path = usePathname();
  const [more, setMore] = useState(false);
  // Always close the "More" sheet on navigation — otherwise its fixed inset-0 z-50 overlay persists on
  // the next page and intercepts every tap (the "can't switch menus without going Back" bug).
  useEffect(() => { setMore(false); }, [path]);
  const bar = NAV.filter((n) => n.bar);
  const overflow = NAV.filter((n) => !n.bar);
  const isActive = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur safe-bottom sm:hidden">
        <div className="flex">
          {bar.map(({ href, label, barLabel, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-xs",
                  active ? "font-semibold text-ink-accent" : "text-ink-muted",
                )}
              >
                <span className={cn("transition-transform duration-200 motion-safe:will-change-transform", active && "motion-safe:scale-110")}>
                  <Icon size={24} stroke={1.8} />
                </span>
                <span className="whitespace-nowrap">{barLabel ?? label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMore(true)}
            className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-xs text-ink-muted"
          >
            <IconDots size={24} stroke={1.8} />
            <span className="whitespace-nowrap">เพิ่มเติม</span>
          </button>
        </div>
      </nav>

      <Sheet open={more} onClose={() => setMore(false)} title="เพิ่มเติม">
        <div className="grid gap-2">
          {overflow.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMore(false)}
              className="flex min-h-[44px] items-center gap-3 rounded-card border border-border p-3 font-medium"
            >
              <Icon size={22} stroke={1.8} className="text-ink-accent" />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          ))}
        </div>
      </Sheet>
    </>
  );
}
