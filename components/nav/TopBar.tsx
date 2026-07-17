"use client";

import Link from "next/link";
import { IconShieldLock } from "@tabler/icons-react";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/nav/ThemeToggle";
import { NotificationBell } from "@/components/nav/NotificationBell";
import { useLiff } from "@/components/line/LiffProvider";
import type { Account } from "@/types";

export function TopBar({ me }: { me: Account }) {
  const { profile } = useLiff();
  // Inside LINE the linked profile name wins; in a normal browser we keep the server identity.
  const displayName = profile?.displayName ?? me.name;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1100px] items-center gap-3 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-hero text-[var(--on-primary)]">N</span>
          <span className="hidden sm:inline">NEDP</span>
        </Link>
        <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
        <Link
          href="/admin"
          title="พอร์ทัลผู้ดูแลระบบ (ต้องใช้รหัสผ่าน)"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-2 text-xs font-medium text-ink-soft hover:bg-surface-soft"
        >
          <IconShieldLock size={16} />
          <span className="hidden sm:inline">ผู้ดูแลระบบ</span>
        </Link>
        <NotificationBell />
        <Link
          href="/profile"
          aria-label="โปรไฟล์ของฉัน"
          className="relative shrink-0"
          title={profile ? `เชื่อมต่อ LINE: ${displayName}` : displayName}
        >
          <Avatar account={{ ...me, name: displayName }} size={34} />
          {profile && (
            <span
              aria-label="เชื่อมต่อ LINE แล้ว"
              className="absolute -bottom-0.5 -right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full border-2 border-surface bg-[#06C755] text-[8px] font-bold leading-none text-white"
            >
              ✓
            </span>
          )}
        </Link>
        </div>
      </div>
    </header>
  );
}
