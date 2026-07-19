import {
  IconHome, IconPencil, IconListCheck, IconTrophy, IconChartBar, IconHelpCircle,
  IconReportAnalytics, IconBriefcase, IconSettings, IconMessageReport, IconAddressBook,
  IconMapPin, IconClipboardList,
} from "@tabler/icons-react";
import type { ComponentType } from "react";

export interface NavItem {
  href: string;
  label: string;
  /** shorter label for the cramped mobile bottom bar (falls back to `label`) */
  barLabel?: string;
  icon: ComponentType<{ size?: number; className?: string; stroke?: number }>;
  /** shows in the mobile bottom tab bar (overflow goes into the "More" sheet) */
  bar?: boolean;
}

/** Two-portal IA: ส่งข้อมูล (do the work) + สถานะ/จัดการ (review + set up). Bottom bar shows the 4
 *  `bar` items + a More sheet for the rest. */
export const NAV: NavItem[] = [
  { href: "/dashboard", label: "หน้าหลัก", icon: IconHome, bar: true },
  { href: "/submit", label: "ส่งข้อมูล", icon: IconPencil, bar: true },
  { href: "/status", label: "สถานะ/จัดการ", barLabel: "สถานะ", icon: IconListCheck, bar: true },
  { href: "/leaderboard", label: "อันดับ", icon: IconTrophy, bar: true },
  { href: "/portal/dashboard", label: "Dashboard", icon: IconReportAnalytics },
  { href: "/reports", label: "รายงาน", icon: IconChartBar },
  { href: "/help", label: "ช่วยเหลือ", icon: IconHelpCircle },
];

/** Admin-portal nav — oversight only (NO ส่งข้อมูล / ลงทะเบียน). Rendered by AdminShell, never the user shell. */
export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "AAI Dashboard", icon: IconReportAnalytics },
  { href: "/admin/status", label: "สถานะโครงการ", icon: IconListCheck },
  { href: "/admin/leaderboard", label: "อันดับ", icon: IconTrophy },
  { href: "/admin/visits", label: "ลงพื้นที่", icon: IconMapPin },
  { href: "/admin/projects", label: "โครงการ", icon: IconBriefcase },
  { href: "/admin/questionnaires", label: "แบบสอบถาม", icon: IconClipboardList },
  { href: "/admin/registrations", label: "ลงทะเบียน", icon: IconAddressBook },
  { href: "/admin/issues", label: "แจ้งปัญหา", icon: IconMessageReport },
  { href: "/admin/settings", label: "ตั้งค่า", icon: IconSettings },
];
