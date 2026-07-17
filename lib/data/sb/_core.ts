/**
 * Shared server-only internals for the Supabase data layer. Every domain module under `sb/` imports
 * from here ONLY (one-way: domain → _core), so this file must not import any sibling domain module.
 * The public barrel (`lib/data/supabase.ts`) re-exports the once-exported members (isProjectContact +
 * the types that live here) — the rest are internal helpers shared across domains.
 */
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CURRENT_MONTH, monthLabelThai } from "@/lib/format";
import { statusLabelOf } from "@/lib/forms/monthlyReport";
import { ACCOUNT_COOKIE, verifyAccountToken } from "@/lib/account-auth";
import type { Account, Project } from "@/types";

/** The signed-in LINE user's account id (cookie set by /api/line/link); null when not logged in.
 *  The cookie is an HMAC-signed token — a forged or plaintext value fails verification and yields null. */
export async function currentAccountId(): Promise<string | null> {
  try {
    const c = await cookies();
    return await verifyAccountToken(c.get(ACCOUNT_COOKIE)?.value);
  } catch {
    return null;
  }
}

export type ARow = { id: string; name: string; org: string | null; avatar_color: string; source_project_id?: number | null; picture_url?: string | null };
type PRow = { id: string; name: string; org: string; researcher: string | null; deadline_day: number; accent: string; avatar_account_id?: string | null; head_account_id?: string | null };

// Column lists kept in lock-step with the toAccount/toProject mappers (single source of truth).
export const ACCOUNT_COLS = "id,name,org,avatar_color,source_project_id,picture_url";
export const PROJECT_COLS = "id,name,org,researcher,deadline_day,accent,avatar_account_id,head_account_id";

export const toAccount = (r: ARow, meId?: string): Account => ({
  id: r.id, name: r.name, org: r.org ?? undefined, avatarColor: r.avatar_color, isMe: r.id === meId,
  sourceProjectId: r.source_project_id ?? undefined,  // stable 1..N ordinal for pseudo 'project' accounts → unique emoji
  pictureUrl: r.picture_url ?? undefined,             // LINE photo → Avatar renders it instead of the emoji
});
export const toProject = (r: PRow): Project => ({
  id: r.id, name: r.name, org: r.org, researcher: r.researcher ?? "", deadlineDay: r.deadline_day, accent: r.accent,
  avatarAccountId: r.avatar_account_id ?? undefined,
  headAccountId: r.head_account_id ?? undefined,
});

/** A project's leaderboard avatar = the admin-chosen contact's LINE picture (else the emoji disc). */
export function withProjectAvatar(account: Account, project: Project, aMap: Map<string, Account>): Account {
  if (project.avatarAccountId) {
    const chosen = aMap.get(project.avatarAccountId);
    if (chosen?.pictureUrl) return { ...account, pictureUrl: chosen.pictureUrl };
  }
  return account;
}

// cache() is per-REQUEST in Next.js (reset each request via AsyncLocalStorage), so this dedupes the
// many meId() calls within one render (layout + page + data fns) without leaking identity across users.
// No cookie → "" (anonymous). Callers already treat empty me as unauthenticated (isProjectContact
// returns false; read fns guard `if (!me) return []`). The old first-account fallback made anonymous
// requests act as a real user — see CRIT-2 in AUDIT.md.
export const meId = cache(async function meId(): Promise<string> {
  return (await currentAccountId()) ?? "";
});

/** Contact-info gate: true once the account has a phone on file. */
export async function _hasContact(db: ReturnType<typeof supabaseAdmin>, me: string): Promise<boolean> {
  if (!me) return false;
  const { data } = await db.from("accounts").select("phone").eq("id", me).maybeSingle();
  return !!(data?.phone && String(data.phone).trim());
}

/** Only a registered contact (a registration AND contact info on file) may write a project's data —
 *  prevents editing other projects + gives traceability. */
export async function isProjectContact(projectId: string): Promise<boolean> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return false;
  const [hasContact, { data: reg }] = await Promise.all([
    _hasContact(db, me),
    db.from("project_account_registrations").select("project_id")
      .eq("account_id", me).eq("project_id", projectId).maybeSingle(),
  ]);
  return hasContact && !!reg;
}

/** True once an admin has enabled individual-level data integration for this project (the request→approve
 *  gate). Bulk person intake (template + upload) is only offered/allowed when this is on. */
export async function isIntegrationEnabled(projectId: string): Promise<boolean> {
  const db = supabaseAdmin();
  const { data } = await db.from("projects").select("individual_integration_enabled").eq("id", projectId).maybeSingle();
  return data?.individual_integration_enabled === true;
}

/** Whether my submission for this location/month is locked (submitted/approved) — i.e. not editable
 *  until an admin approves an edit request (which flips it back to draft). */
export async function _isLocked(
  db: ReturnType<typeof supabaseAdmin>, projectId: string, locationId: string, me: string, month: string,
): Promise<boolean> {
  const { data } = await db.from("location_submissions").select("status")
    .eq("project_id", projectId).eq("location_id", locationId).eq("account_id", me).eq("year_month", month)
    .maybeSingle();
  return data?.status === "submitted" || data?.status === "approved";
}

/** Stamp the auto-derived operating status (ยังไม่เริ่ม / กำลังดำเนินการ / เสร็จสิ้น) into the data blob,
 *  so the ทีละพื้นที่ form, the ตาราง grid, the Excel export, the report, and the bot's monitor_facts
 *  all show the SAME status regardless of which of the 3 entry surfaces wrote the row. Computed from
 *  data completeness — never user-typed (requirement: auto สถานะ). */
export const withStatus = (values?: Record<string, string>): Record<string, string> => {
  const v = values ?? {};
  return { ...v, status: statusLabelOf(v) };
};

export function _num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export type PersonRow = {
  personId: string; personCode: string; fullName: string | null;
  tambonCode: string; tambonTh: string; sex: string | null; ageBand: string | null;
  latestMonth: string | null; latestOverall: number | null; hasClinicalFlag: boolean;
};

export const _toPersonRow = (r: Record<string, unknown>): PersonRow => ({
  personId: String(r.person_id ?? ""), personCode: String(r.person_code ?? ""),
  fullName: r.full_name == null ? null : String(r.full_name),
  tambonCode: String(r.tambon_code ?? ""), tambonTh: String(r.tambon_th ?? ""),
  sex: r.sex == null ? null : String(r.sex), ageBand: r.age_band == null ? null : String(r.age_band),
  latestMonth: r.latest_year_month == null ? null : String(r.latest_year_month),
  latestOverall: _num(r.latest_overall), hasClinicalFlag: r.has_clinical_flag === true,
});

export const splitProvinces = (s: string | null) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

// ── LINE reminders from Vercel (Wave 3) — manual sends + the monitor_notifications log ─────────────
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://your-app.example";

/** monitor_notifications.report_month is Thai-BE ('YYYY-MM'); CURRENT_MONTH is Gregorian → add 543. */
export function reportMonthBE(gregorian = CURRENT_MONTH): string {
  const [y, m] = gregorian.split("-");
  return `${Number(y) + 543}-${m}`;
}

export type ReminderType = "submit" | "location";

export function reminderText(type: ReminderType, projectName: string): string {
  const monthTh = monthLabelThai(CURRENT_MONTH);
  return type === "submit"
    ? `📤 แจ้งเตือนส่งข้อมูล\nโครงการ “${projectName}”\nกรุณาส่งข้อมูลรายเดือนประจำเดือน ${monthTh}\nเปิดระบบเพื่อส่งข้อมูล: ${APP_URL}/submit`
    : `📍 แจ้งเตือนยืนยันพื้นที่\nโครงการ “${projectName}”\nกรุณายืนยันรายการพื้นที่ลงพื้นที่ของโครงการ\nเปิดระบบเพื่อยืนยัน: ${APP_URL}/status`;
}

export type MonitorSettings = {
  notificationsEnabled: boolean; locationRemindersEnabled: boolean;
  deadlineDay: number; advanceDays: number; overdueEveryDays: number;
  /** Bangkok hour (0–23) the daily reminders are delivered; the cron gates on it. Default 9 (~today's 09:00). */
  sendHour: number;
};
export const DEFAULT_SETTINGS: MonitorSettings = {
  notificationsEnabled: true, locationRemindersEnabled: true, deadlineDay: 25, advanceDays: 5, overdueEveryDays: 3, sendHour: 9,
};
