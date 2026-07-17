"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconBook,
  IconBug,
  IconChevronRight,
  IconMail,
  IconBrandLine,
} from "@tabler/icons-react";
import type { ComponentType, ReactNode } from "react";
import { IconBadge } from "@/components/ui/IconBadge";
import { ReportIssueSheet } from "@/components/help/ReportIssueSheet";

type HelpIcon = ComponentType<{ size?: number; className?: string; stroke?: number }>;

/** Shared inner content for a help card (icon + title + desc + → affordance). */
function CardInner({
  icon,
  color,
  title,
  desc,
}: {
  icon: HelpIcon;
  color: string;
  title: string;
  desc: string;
}) {
  return (
    <>
      <IconBadge icon={icon} color={color} />
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-semibold text-ink">{title}</p>
        <p className="mt-0.5 truncate text-sm text-ink-soft">{desc}</p>
      </div>
      <IconChevronRight size={20} className="shrink-0 text-ink-muted" />
    </>
  );
}

const CARD_CLASS =
  "card flex min-h-[72px] items-center gap-3 p-4 text-left shadow-card transition " +
  "border-border hover:border-border-accent";

// The manual is the primary help resource (a public, shareable guide) — featured full-width, above the grid.
const FEATURED_CLASS =
  "card flex items-center gap-4 p-5 text-left shadow-card transition " +
  "border-border-accent hover:border-border-accent";

export default function HelpPage() {
  const [reportOpen, setReportOpen] = useState(false);
  const [showContact, setShowContact] = useState(false);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="hero-heading">ช่วยเหลือ</h1>
        <p className="mt-2 text-sm text-ink-soft">ค้นหาคำตอบ แจ้งปัญหา หรือติดต่อทีมงาน NEDP</p>
      </header>

      {/* คู่มือการใช้งาน — the public, shareable guide website: featured above the grid */}
      <Link href="/manual" className={FEATURED_CLASS} aria-label="เปิดคู่มือการใช้งาน">
        <IconBadge icon={IconBook} color="#1a56db" size={52} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold text-ink">คู่มือการใช้งาน</p>
          <p className="mt-0.5 text-sm text-ink-soft">
            เปิดคู่มือเว็บไซต์ · ดูวิธีใช้ระบบทั้งหมด · แชร์ได้ (เปิดได้โดยไม่ต้องเข้าสู่ระบบ)
          </p>
        </div>
        <IconChevronRight size={22} className="shrink-0 text-ink-muted" />
      </Link>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* รายงานปัญหา — opens the sheet */}
        <button
          type="button"
          className={CARD_CLASS}
          aria-label="รายงานปัญหา"
          onClick={() => setReportOpen(true)}
        >
          <CardInner icon={IconBug} color="#d92d20" title="รายงานปัญหา" desc="แจ้งข้อผิดพลาด" />
        </button>

        {/* ติดต่อทีมงาน — toggles inline contact info */}
        <button
          type="button"
          className={CARD_CLASS}
          aria-label="ติดต่อทีมงาน"
          aria-expanded={showContact}
          onClick={() => setShowContact((v) => !v)}
        >
          <CardInner icon={IconBrandLine} color="#0e9f6e" title="ติดต่อทีมงาน" desc="แชทกับทีมงานผ่าน LINE" />
        </button>
      </div>

      {showContact && (
        <div className="card animate-fadeUp space-y-3 p-4 shadow-card">
          <p className="font-display text-base font-semibold text-ink">ช่องทางติดต่อทีมงาน NEDP</p>
          <ContactRow
            icon={IconBrandLine}
            label="ติดต่อทีมงาน (LINE)"
            value="แชท / เพิ่มเพื่อน"
            href="https://line.me/ti/p/-your-team-line-id"
          />
          <ContactRow
            icon={IconMail}
            label="อีเมล"
            value="support@your-org.example"
            href="mailto:support@your-org.example"
          />
          <p className="text-xs text-ink-muted">เวลาทำการ จันทร์–ศุกร์ 08.30–16.30 น.</p>
        </div>
      )}

      <ReportIssueSheet open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: HelpIcon;
  label: string;
  value: ReactNode;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex min-h-[44px] items-center gap-3 rounded-card px-1 py-1.5 hover:bg-surface-soft"
    >
      <IconBadge icon={Icon} color="#0e9f6e" size={40} />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-muted">{label}</p>
        <p className="truncate text-sm font-medium text-ink">{value}</p>
      </div>
    </a>
  );
}
