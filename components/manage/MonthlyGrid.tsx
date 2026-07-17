"use client";

import { useRef, useState, Fragment } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { FACT_COLUMNS, METRIC_GROUPS } from "@/lib/factMonthly";
import { deriveStatus, STATUS_LABEL } from "@/lib/forms/monthlyReport";
import {
  IconCircleCheck, IconLock, IconSend, IconDeviceFloppy, IconLoader2, IconPencil, IconCopy, IconHistory,
} from "@tabler/icons-react";
import type { ProjectLocation } from "@/types";

/** Server-supplied per-location state (my current submission for this month + lock/edit flags). */
type Initial = Record<string, { status: string; locked: boolean; editRequested: boolean; data: Record<string, string> }>;
/** One past month of the signed-in user's submissions for this project (newest first). */
export type MonthHistory = { yearMonth: string; label: string; submitted: number; total: number; lastSubmittedAt?: string };
type RowState = {
  values: Record<string, string>;
  status: "not_started" | "draft" | "submitted";
  locked: boolean;
  editRequested: boolean;
  saving: boolean;
  saved: boolean;
};

// Columns derive from the shared METRIC_GROUPS (the ทีละพื้นที่ master) — a pair renders 2 columns,
// a หลัง-only metric (e.g. "AAI เพิ่ม 10%") renders ONE. Note columns = free-text; สถานะ is auto-derived.
const NOTE_COLS = FACT_COLUMNS.filter((c) => c.kind === "text" && c.key !== "status"); // issues, recommendations

const statusChip: Record<string, string> = {
  not_started: "bg-surface-soft text-ink-soft",
  in_progress: "bg-warning-bg text-warning-fg",
  completed: "bg-success-bg text-success-fg",
};

const cell =
  "h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm text-ink outline-none focus:border-border-accent focus:ring-2 focus:ring-border-accent/30 disabled:bg-surface-soft disabled:text-ink-muted";

function clean(v: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(v).filter(([, val]) => String(val ?? "").trim() !== ""));
}

/** ISO → short Thai date (d/m/yy พ.ศ.) for the history list. */
function shortDate(iso?: string): string {
  if (!iso) return "";
  const [d] = iso.split("T");
  const [y, m, day] = d.split("-").map(Number);
  if (!y) return "";
  return `${day}/${m}/${(y + 543) % 100}`;
}

/**
 * In-app monthly-report grid — the "built-in grid" sibling of the ทีละพื้นที่ form: rows = locations,
 * columns = the shared METRIC_GROUPS (+ notes + auto สถานะ). Writes the SAME location_submissions via
 * the SAME endpoints as the xlsx upload (save-draft-location / submit-location / save-submissions), so
 * it inherits the verified sync chain (→ monitor_submissions/monitor_facts → Power BI + leaderboard).
 * No column/locality matching: each cell already knows its location id + metric key.
 */
export function MonthlyGrid({
  projectId, locations, initial, hints, doneIds, canEdit, monthLabel, history = [],
}: {
  projectId: string;
  locations: ProjectLocation[];
  initial: Initial;
  /** Previous-month submitted values per location (reference for this month's input). */
  hints: Record<string, Record<string, string>>;
  doneIds: string[];
  canEdit: boolean;
  monthLabel: string;
  /** The signed-in user's past monthly submissions for this project (newest first). */
  history?: MonthHistory[];
}) {
  const doneSet = new Set(doneIds);
  const [showHistory, setShowHistory] = useState(false);
  const valuesRef = useRef<Record<string, Record<string, string>>>(
    Object.fromEntries(locations.map((l) => [l.id, { ...(initial[l.id]?.data ?? {}) }])),
  );
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(locations.map((l) => {
      const s = initial[l.id];
      return [l.id, {
        values: { ...(s?.data ?? {}) },
        status: (s?.status as RowState["status"]) ?? "not_started",
        locked: s?.locked ?? false,
        editRequested: s?.editRequested ?? false,
        saving: false, saved: false,
      }];
    })),
  );
  const [bulkBusy, setBulkBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const post = (url: string, body: unknown) =>
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(async (r) => { const d = await r.json().catch(() => ({})); return r.ok && (d as { ok?: boolean }).ok === true; })
      .catch(() => false);

  function setCell(id: string, key: string, v: string) {
    valuesRef.current[id] = { ...valuesRef.current[id], [key]: v };
    setRows((p) => ({ ...p, [id]: { ...p[id], values: valuesRef.current[id], saved: false } }));
    scheduleSave(id);
  }

  /** Copy this location's previous-month values into its EMPTY cells (review-then-submit, no auto-send). */
  function applyPrev(id: string) {
    const prev = hints[id];
    if (!prev || rows[id]?.locked) return;
    const cur = { ...valuesRef.current[id] };
    let changed = false;
    for (const [k, v] of Object.entries(prev)) {
      if (k === "status") continue; // สถานะ is auto-derived — never copy a stale label in
      if (v != null && String(v).trim() !== "" && String(cur[k] ?? "").trim() === "") { cur[k] = String(v); changed = true; }
    }
    if (!changed) return;
    valuesRef.current[id] = cur;
    setRows((p) => ({ ...p, [id]: { ...p[id], values: cur, saved: false } }));
    scheduleSave(id);
  }

  function scheduleSave(id: string) {
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      if (rows[id]?.locked) return; // locked rows are read-only (server also rejects)
      setRows((p) => ({ ...p, [id]: { ...p[id], saving: true } }));
      const ok = await post("/api/save-draft-location", { projectId, locationId: id, values: clean(valuesRef.current[id]) });
      setRows((p) => ({
        ...p,
        [id]: { ...p[id], saving: false, saved: ok, status: ok && p[id].status === "not_started" ? "draft" : p[id].status },
      }));
    }, 800);
  }

  async function submitRow(id: string) {
    clearTimeout(timers.current[id]);
    setRows((p) => ({ ...p, [id]: { ...p[id], saving: true } }));
    const ok = await post("/api/submit-location", { projectId, locationId: id, values: clean(valuesRef.current[id]) });
    setRows((p) => ({
      ...p,
      [id]: { ...p[id], saving: false, locked: ok || p[id].locked, status: ok ? "submitted" : p[id].status, editRequested: false, saved: false },
    }));
    if (!ok) setBanner("ส่งข้อมูลไม่สำเร็จ — ลองใหม่อีกครั้ง");
  }

  async function requestEdit(id: string) {
    const ok = await post("/api/request-edit", { projectId, locationId: id });
    if (ok) setRows((p) => ({ ...p, [id]: { ...p[id], editRequested: true } }));
    else setBanner("ส่งคำขอแก้ไขไม่สำเร็จ");
  }

  async function submitAll() {
    setBulkBusy(true); setBanner(null);
    const payload = locations
      .filter((l) => !rows[l.id].locked)
      .map((l) => ({ locationId: l.id, values: clean(valuesRef.current[l.id]) }))
      .filter((r) => Object.keys(r.values).length > 0);
    if (payload.length === 0) { setBulkBusy(false); setBanner("ยังไม่มีข้อมูลใหม่ให้ส่ง"); return; }
    try {
      const res = await fetch("/api/save-submissions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, rows: payload }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; saved?: number; error?: string };
      if (res.ok && d.ok) {
        setRows((p) => {
          const n = { ...p };
          for (const r of payload) n[r.locationId] = { ...n[r.locationId], locked: true, status: "submitted", saved: false };
          return n;
        });
        setBanner(`ส่งข้อมูล ${d.saved ?? payload.length} พื้นที่แล้ว ✓`);
      } else setBanner(d.error === "not_contact" ? "ต้องลงทะเบียนเป็นผู้ติดต่อก่อน" : "ส่งทั้งหมดไม่สำเร็จ — ลองใหม่อีกครั้ง");
    } finally { setBulkBusy(false); }
  }

  const total = locations.length;
  const submittedCount = locations.filter((l) => rows[l.id].locked || doneSet.has(l.id)).length;

  return (
    <div className="space-y-3">
      {!canEdit && (
        <Card className="border-warning/40 bg-warning-bg p-3 text-sm text-warning-fg">
          👁️ ดูแบบอ่านอย่างเดียว — ต้อง{" "}
          <Link href="/register" className="font-semibold underline">ลงทะเบียนเป็นผู้ติดต่อ</Link>{" "}
          ของโครงการนี้ก่อน จึงจะกรอก/ส่งข้อมูลได้
        </Card>
      )}

      {history.length > 0 && (
        <Card className="p-0">
          <button onClick={() => setShowHistory((s) => !s)} className="flex min-h-[44px] w-full items-center justify-between px-4 py-2.5 text-left">
            <span className="inline-flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
              <IconHistory size={16} /> ประวัติการส่งของฉัน
            </span>
            <span className="text-xs text-ink-soft">{showHistory ? "ซ่อน" : `${history.length} เดือน`}</span>
          </button>
          {showHistory && (
            <ul className="divide-y divide-border border-t border-border">
              {history.map((h) => (
                <li key={h.yearMonth} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="font-medium text-ink">{h.label}</span>
                  <span className="text-ink-soft">
                    ส่ง {h.submitted}/{h.total} พื้นที่{h.lastSubmittedAt ? ` · ${shortDate(h.lastSubmittedAt)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-soft">
          กรอกได้ทุกช่อง แล้วระบบ<b>บันทึกร่างอัตโนมัติ</b> · กด “ส่ง” เพื่อยืนยันแต่ละพื้นที่ ·
          คอลัมน์ <b>สถานะ</b> ระบบคำนวณให้อัตโนมัติจากความครบถ้วน
          <span className="ml-1 text-ink-muted">({submittedCount}/{total} ส่งแล้ว · รอบ {monthLabel})</span>
        </p>
        <Button variant="primary" disabled={!canEdit || bulkBusy} onClick={submitAll}>
          {bulkBusy ? <IconLoader2 size={16} className="animate-spin" /> : <IconSend size={16} />} ส่งทั้งหมด
        </Button>
      </div>

      {banner && <div className="rounded-card bg-surface-soft p-2.5 text-center text-sm font-medium text-ink-soft">{banner}</div>}

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-max min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-soft">
              <th rowSpan={2} className="sticky left-0 z-20 min-w-[180px] border-b border-r border-border bg-surface-soft px-3 py-2 text-left align-bottom font-semibold text-ink">
                พื้นที่ (ตำบล)
              </th>
              {METRIC_GROUPS.map((g) => (
                <th
                  key={g.id}
                  colSpan={g.before ? 2 : 1}
                  rowSpan={g.before ? 1 : 2}
                  title={g.scale === "score" ? "คะแนน 0–100" : "จำนวนคน"}
                  className="border-b border-l border-border px-2 py-2 text-center align-bottom text-xs font-semibold text-ink"
                >
                  {g.label}
                  <span className="ml-1 font-normal text-ink-muted">({g.unit})</span>
                </th>
              ))}
              {NOTE_COLS.map((c) => (
                <th key={c.key} rowSpan={2} title={c.help} className="min-w-[180px] border-b border-l border-border px-2 py-2 text-center align-bottom text-xs font-semibold text-ink">
                  {c.th}
                </th>
              ))}
              <th rowSpan={2} className="min-w-[136px] border-b border-l border-border px-2 py-2 text-center align-bottom text-xs font-semibold text-ink">
                สถานะ
              </th>
            </tr>
            <tr className="bg-surface-soft text-xs text-ink-muted">
              {METRIC_GROUPS.map((g) =>
                g.before ? (
                  <Fragment key={g.id}>
                    <th className="border-l border-border px-2 py-1 font-medium">ก่อน</th>
                    <th className="px-2 py-1 font-medium">หลัง</th>
                  </Fragment>
                ) : null,
              )}
            </tr>
          </thead>
          <tbody>
            {locations.map((l) => {
              const r = rows[l.id];
              const done = r.locked || doneSet.has(l.id);
              const disabled = !canEdit || r.locked;
              const op = deriveStatus(r.values); // auto สถานะ from completeness (live)
              return (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="sticky left-0 z-10 min-w-[180px] border-r border-border bg-surface px-3 py-2 align-top">
                    <div className="truncate font-medium text-ink">{l.tambon || "(ยังไม่ระบุตำบล)"}</div>
                    <div className="truncate text-xs text-ink-muted">{l.amphoe}{l.amphoe && l.province ? ", " : ""}{l.province}</div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
                        done ? "bg-success-bg text-success-fg" : r.status === "draft" ? "bg-surface-soft text-ink-soft" : "bg-warning-bg text-warning-fg")}>
                        {done ? <IconCircleCheck size={12} /> : null}
                        {done ? "ส่งแล้ว" : r.status === "draft" ? "ร่าง" : "ยังไม่ส่ง"}
                      </span>
                      {r.saving ? <span className="inline-flex items-center gap-0.5 text-xs text-ink-muted"><IconLoader2 size={11} className="animate-spin" /> บันทึก…</span>
                        : r.saved ? <span className="inline-flex items-center gap-0.5 text-xs text-success-fg"><IconDeviceFloppy size={11} /> ร่างแล้ว</span> : null}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {r.locked ? (
                        r.editRequested ? (
                          <span className="inline-flex items-center gap-1 text-xs text-warning-fg"><IconLock size={11} /> รออนุมัติแก้ไข</span>
                        ) : (
                          <button onClick={() => requestEdit(l.id)} className="inline-flex items-center gap-1 text-xs font-medium text-ink-accent min-h-[28px]">
                            <IconPencil size={12} /> ขอแก้ไข
                          </button>
                        )
                      ) : (
                        <>
                          <button onClick={() => submitRow(l.id)} disabled={disabled || r.saving}
                            className="inline-flex items-center gap-1 rounded-lg bg-hero px-2.5 py-1 text-xs font-semibold text-[var(--on-primary)] disabled:opacity-40">
                            <IconSend size={12} /> ส่ง
                          </button>
                          {canEdit && hints[l.id] && Object.keys(hints[l.id]).length > 0 && (
                            <button onClick={() => applyPrev(l.id)} title="เติมค่าจากเดือนก่อนในช่องที่ยังว่าง"
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-ink-soft hover:bg-surface-soft">
                              <IconCopy size={12} /> ใช้ค่าเดือนก่อน
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  {METRIC_GROUPS.map((g) => {
                    const keys = g.before ? [g.before, g.after] : [g.after];
                    return keys.map((key) => (
                      <td key={key} className="border-l border-border px-1.5 py-1.5 align-top">
                        <input
                          type="number"
                          inputMode={g.scale === "score" ? "decimal" : "numeric"}
                          step={g.scale === "score" ? "0.01" : "1"}
                          min={0}
                          {...(g.scale === "score" ? { max: 100 } : {})}
                          className={cn(cell, "text-right", g.scale === "score" ? "min-w-[76px]" : "min-w-[64px]")}
                          value={r.values[key] ?? ""}
                          placeholder={hints[l.id]?.[key] ?? ""}
                          disabled={disabled}
                          onChange={(e) => setCell(l.id, key, e.target.value)}
                        />
                        {hints[l.id]?.[key] ? (
                          <div className="mt-0.5 whitespace-nowrap text-right text-xs text-ink-muted" title="ค่าที่ส่งเดือนก่อน">
                            ก่อนหน้า: {hints[l.id]![key]}
                          </div>
                        ) : null}
                      </td>
                    ));
                  })}
                  {NOTE_COLS.map((c) => (
                    <td key={c.key} className="border-l border-border px-1.5 py-1.5 align-top">
                      <input type="text" className={cn(cell, "min-w-[170px]")} value={r.values[c.key] ?? ""}
                        placeholder={hints[l.id]?.[c.key] ?? ""} disabled={disabled}
                        onChange={(e) => setCell(l.id, c.key, e.target.value)} />
                    </td>
                  ))}
                  <td className="border-l border-border px-2 py-1.5 text-center align-middle">
                    <span
                      title="ระบบกำหนดอัตโนมัติจากความครบถ้วนของข้อมูล"
                      className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", statusChip[op])}
                    >
                      {STATUS_LABEL[op]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
