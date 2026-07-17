"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconShieldLock, IconLogout } from "@tabler/icons-react";
import { ADMIN_NAV } from "@/lib/nav";
import { ThemeToggle } from "@/components/nav/ThemeToggle";
import { AdminNotificationBell } from "@/components/admin/AdminNotificationBell";
import { cn } from "@/lib/utils";

/** Self-contained admin chrome: oversight-only nav (no ส่งข้อมูล / ลงทะเบียน) + logout. Everything (project
 *  CRUD, reminders, site visits, the LINE bot) now runs here on Vercel. The login route renders bare. */
export function AdminShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  if (path === "/admin/login") return <>{children}</>;

  const isActive = (href: string) =>
    href === "/admin" ? path === "/admin" : path === href || path?.startsWith(href + "/");

  return (
    <div className="min-h-screen bg-surface-soft">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center gap-3 px-4">
          <Link href="/admin" className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-hero text-[var(--on-primary)]">
              <IconShieldLock size={18} />
            </span>
            <span>ผู้ดูแลระบบ<span className="hidden text-sm font-normal text-ink-muted sm:inline"> · NEDP</span></span>
          </Link>
          <div className="ml-auto flex items-center gap-1.5">
            <AdminNotificationBell />
            <ThemeToggle />
            <form action="/api/admin/logout" method="post">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-2 text-xs font-medium text-ink-soft hover:bg-surface-soft"
              >
                <IconLogout size={16} />
                <span className="hidden sm:inline">ออกจากระบบ</span>
              </button>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-[1100px] px-4">
          <nav className="flex gap-1 overflow-x-auto pb-2">
            {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition",
                  isActive(href) ? "bg-accent-soft text-ink-accent" : "text-ink-soft hover:bg-surface",
                )}
              >
                <Icon size={16} /> {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1100px] px-4 py-5">{children}</main>
    </div>
  );
}
