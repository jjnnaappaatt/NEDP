import Link from "next/link";
import { IconBell, IconSearch, IconShieldLock } from "@tabler/icons-react";

/**
 * Static, data-free stand-in for <TopBar> shown while getMe() streams (Suspense fallback in AppShell).
 * Matches the bar's height/chrome so the shell paints instantly with no layout shift; the avatar is a
 * skeleton until the real identity resolves a beat later.
 */
export function TopBarSkeleton() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1100px] items-center gap-3 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-hero text-[var(--on-primary)]">N</span>
          <span className="hidden sm:inline">NEDP</span>
        </Link>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-2 text-xs font-medium text-ink-muted">
            <IconShieldLock size={16} />
            <span className="hidden sm:inline">ผู้ดูแลระบบ</span>
          </span>
          <span className="grid h-11 w-11 place-items-center rounded-full text-ink-muted"><IconSearch size={20} /></span>
          <span className="grid h-11 w-11 place-items-center rounded-full text-ink-muted"><IconBell size={20} /></span>
          <span className="h-[34px] w-[34px] shrink-0 animate-pulse rounded-full bg-surface-soft" aria-hidden />
        </div>
      </div>
    </header>
  );
}
