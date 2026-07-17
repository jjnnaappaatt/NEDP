"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { IconCheck } from "@tabler/icons-react";
import type { MonitorSettings } from "@/lib/data";

const inputCls =
  "w-24 rounded-card border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent";

export function SettingsForm({ initial }: { initial: MonitorSettings }) {
  const [s, setS] = useState<MonitorSettings>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      if (res.ok) setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  const Toggle = ({ label, hint, val, on }: { label: string; hint?: string; val: boolean; on: (v: boolean) => void }) => (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1">
      <span className="text-sm">
        <span className="font-medium text-ink">{label}</span>
        {hint && <span className="block text-xs text-ink-muted">{hint}</span>}
      </span>
      <input type="checkbox" checked={val} onChange={(e) => { on(e.target.checked); setSaved(false); }}
        className="h-5 w-5 accent-[var(--accent)]" />
    </label>
  );
  const NumRow = ({ label, hint, val, min, max, on }: { label: string; hint: string; val: number; min: number; max: number; on: (v: number) => void }) => (
    <label className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="block text-xs text-ink-muted">{hint}</span>
      </span>
      <input type="number" min={min} max={max} value={val} className={inputCls}
        onChange={(e) => { on(Number(e.target.value)); setSaved(false); }} />
    </label>
  );
  const HourRow = ({ label, hint, val, on }: { label: string; hint: string; val: number; on: (v: number) => void }) => (
    <label className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="block text-xs text-ink-muted">{hint}</span>
      </span>
      <select value={val} className={inputCls} onChange={(e) => { on(Number(e.target.value)); setSaved(false); }}>
        {Array.from({ length: 24 }, (_, h) => (
          <option key={h} value={h}>{String(h).padStart(2, "0")}:00 น.</option>
        ))}
      </select>
    </label>
  );

  return (
    <Card className="max-w-lg space-y-3">
      <Toggle label="เปิดการแจ้งเตือนทั้งหมด" hint="สวิตช์หลัก — ปิดแล้วจะไม่ส่งการแจ้งเตือนใด ๆ"
        val={s.notificationsEnabled} on={(v) => setS({ ...s, notificationsEnabled: v })} />
      <Toggle label="แจ้งเตือนยืนยันพื้นที่" hint="เตือนโครงการที่ยังไม่ยืนยันพื้นที่ลงพื้นที่"
        val={s.locationRemindersEnabled} on={(v) => setS({ ...s, locationRemindersEnabled: v })} />
      <div className="border-t border-border pt-2">
        <NumRow label="วันครบกำหนดส่ง" hint="วันที่ของเดือน (1–28)" val={s.deadlineDay} min={1} max={28}
          on={(v) => setS({ ...s, deadlineDay: v })} />
        <NumRow label="แจ้งล่วงหน้า" hint="กี่วันก่อนครบกำหนด (0–28)" val={s.advanceDays} min={0} max={28}
          on={(v) => setS({ ...s, advanceDays: v })} />
        <NumRow label="ย้ำซ้ำทุก ๆ" hint="กี่วันเมื่อเลยกำหนด (1–30)" val={s.overdueEveryDays} min={1} max={30}
          on={(v) => setS({ ...s, overdueEveryDays: v })} />
        <HourRow label="เวลาที่ส่งแจ้งเตือน" hint="เวลาประจำวันที่ระบบส่งการแจ้งเตือน (ตามเวลาไทย)" val={s.sendHour}
          on={(v) => setS({ ...s, sendHour: v })} />
      </div>
      <div className="flex items-center gap-3 border-t border-border pt-3">
        <button onClick={save} disabled={busy}
          className="rounded-card bg-hero px-5 py-2 text-sm font-semibold text-[var(--on-primary)] transition disabled:opacity-50">
          {busy ? "กำลังบันทึก…" : "บันทึก"}
        </button>
        {saved && <span className="inline-flex items-center gap-1 text-sm text-success-fg"><IconCheck size={16} /> บันทึกแล้ว</span>}
      </div>
    </Card>
  );
}
