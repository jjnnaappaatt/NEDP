"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/forms/ProgressBar";
import { LocationManager } from "@/components/status/LocationManager";
import { LocationXlsxCard } from "@/components/status/LocationXlsxCard";
import { UnregisterButton } from "@/components/status/UnregisterButton";
import { ActivityFeed } from "@/components/status/ActivityFeed";
import { cn } from "@/lib/utils";
import {
  IconListCheck, IconAdjustments, IconCircleCheck, IconMapPin, IconPencil, IconHistory, IconArrowRight, IconUsersGroup,
} from "@tabler/icons-react";
import type { MonthHistory } from "@/components/manage/MonthlyGrid";
import type { ProjectActivityItem } from "@/lib/data/sb/activity";
import type { LocationAuditEntry, LocationVerification, ProjectLocation } from "@/types";

type SubmissionState = { id: string; status: string; data: Record<string, string>; locked: boolean; editRequested: boolean };
type Tab = "status" | "manage" | "activity";

function shortDate(iso?: string): string {
  if (!iso) return "";
  const [d] = iso.split("T");
  const [y, m, day] = d.split("-").map(Number);
  return y ? `${day}/${m}/${(y + 543) % 100}` : "";
}

/** The สถานะ/จัดการ portal hub: SEE status (read-only) + MANAGE the project (location list, verify,
 *  Excel, leave). Data entry itself lives in the ส่งข้อมูล portal (the prominent CTA here). */
export function StatusManageHub({
  projectId, projectName, locations, doneIds, submissions, verification, audit, meName, canEdit, history, startManage,
  activity,
}: {
  projectId: string;
  projectName: string;
  locations: ProjectLocation[];
  doneIds: string[];
  submissions: Record<string, SubmissionState>;
  verification: LocationVerification | null;
  audit: LocationAuditEntry[];
  meName: string;
  canEdit: boolean;
  history: MonthHistory[];
  startManage: boolean;
  /** chief/owner-only team feed — omitting it hides the กิจกรรมทีม tab entirely */
  activity?: ProjectActivityItem[];
}) {
  const [tab, setTab] = useState<Tab>(startManage ? "manage" : "status");
  const doneSet = new Set(doneIds);
  const doneCount = locations.filter((l) => doneSet.has(l.id)).length;
  const tabCls = (active: boolean) =>
    cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium min-h-[44px] transition",
      active ? "bg-hero text-[var(--on-primary)]" : "text-ink-soft hover:bg-surface");

  return (
    <div className="space-y-4">
      <Link href={`/submit/${projectId}`}
        className="flex items-center justify-center gap-2 rounded-card bg-accent px-4 py-3 text-sm font-semibold text-[var(--on-accent)]">
        <IconPencil size={18} /> ส่งข้อมูลเดือนนี้ <IconArrowRight size={16} />
      </Link>

      <div className="flex gap-1 rounded-card border border-border bg-surface-soft/60 p-1">
        <button onClick={() => setTab("status")} className={tabCls(tab === "status")}>
          <IconListCheck size={16} /> สถานะ
        </button>
        <button onClick={() => setTab("manage")} className={tabCls(tab === "manage")}>
          <IconAdjustments size={16} /> จัดการพื้นที่
        </button>
        {activity && (
          <button onClick={() => setTab("activity")} className={tabCls(tab === "activity")}>
            <IconUsersGroup size={16} /> กิจกรรมทีม
          </button>
        )}
      </div>

      {tab === "activity" && activity ? (
        <Card className="space-y-1">
          <h3 className="font-display text-base font-semibold text-ink">กิจกรรมของสมาชิกในโครงการ</h3>
          <p className="text-xs text-ink-muted">
            การกระทำที่มีผลต่อข้อมูลโครงการ (ลงทะเบียน · คะแนน AAI · การส่งรายงาน · การแก้ไข/ลบ) — เห็นเฉพาะหัวหน้าโครงการ
          </p>
          <ActivityFeed items={activity} />
        </Card>
      ) : tab === "status" ? (
        <div className="space-y-4">
          <ProgressBar filled={doneCount} total={locations.length} label="ส่งแล้ว" unit="พื้นที่" />

          <div className="space-y-2">
            {locations.map((l) => {
              const ok = doneSet.has(l.id);
              const draft = !ok && submissions[l.id]?.status === "draft";
              return (
                <div key={l.id} className={cn("card flex items-center gap-3 p-3", ok && "bg-success-bg/30")}>
                  <span className="icon-badge" style={ok ? { background: "#16a34a1a", color: "#16a34a" } : { background: "var(--accent-soft)", color: "var(--text-accent)" }}>
                    {ok ? <IconCircleCheck size={22} /> : <IconMapPin size={22} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-ink">{l.tambon || "(ยังไม่ระบุตำบล)"}</div>
                    <div className="truncate text-xs text-ink-muted">{l.amphoe}{l.amphoe && l.province ? ", " : ""}{l.province}</div>
                  </div>
                  <span className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
                    ok ? "bg-success-bg text-success-fg" : draft ? "bg-surface-soft text-ink-soft" : "bg-warning-bg text-warning-fg")}>
                    {ok ? "✓ ส่งแล้ว" : draft ? "ร่าง" : "ยังไม่ส่ง"}
                  </span>
                </div>
              );
            })}
          </div>

          {history.length > 0 && (
            <Card className="space-y-2">
              <h3 className="inline-flex items-center gap-1.5 font-display text-base font-semibold text-ink">
                <IconHistory size={18} /> ประวัติการส่งของฉัน
              </h3>
              <ul className="divide-y divide-border">
                {history.map((h) => (
                  <li key={h.yearMonth} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="font-medium text-ink">{h.label}</span>
                    <span className="text-ink-soft">ส่ง {h.submitted}/{h.total} พื้นที่{h.lastSubmittedAt ? ` · ${shortDate(h.lastSubmittedAt)}` : ""}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <LocationManager
            projectId={projectId}
            initialLocations={locations}
            initialVerification={verification}
            initialAudit={audit}
            meName={meName}
            canEdit={canEdit}
          />
          <LocationXlsxCard projectId={projectId} canEdit={canEdit} meName={meName} />
          <Card className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-display text-base font-semibold text-ink">ออกจากโครงการ</div>
              <div className="text-xs text-ink-soft">ยกเลิกการลงทะเบียน + การแจ้งเตือน LINE (ข้อมูลที่ส่งแล้วยังอยู่)</div>
            </div>
            <UnregisterButton projectId={projectId} projectName={projectName} />
          </Card>
        </div>
      )}
    </div>
  );
}
