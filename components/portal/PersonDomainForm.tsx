"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { DomainScoreInput } from "./DomainScoreInput";
import { fieldCls, portalErr } from "./fieldStyles";
import { CURRENT_MONTH } from "@/lib/format";
import type { PersonAssessmentPoint } from "@/lib/data";

const DOMAINS = [
  { key: "d1", label: "มิติ 1 · การมีงานทำและรายได้", w: 0.30 },
  { key: "d2", label: "มิติ 2 · การมีส่วนร่วมในสังคม", w: 0.15 },
  { key: "d3", label: "มิติ 3 · สุขภาพและความมั่นคงปลอดภัย", w: 0.30 },
  { key: "d4", label: "มิติ 4 · สภาพแวดล้อมที่เอื้อต่อสุขภาวะ", w: 0.25 },
] as const;

/** Mirror of the DB trigger (weights: Thai-Adapted 30/15/30/25). Overall = weighted sum renormalized over the filled domains. */
function calcOverall(vals: Record<string, string>): number | null {
  let wsum = 0, acc = 0;
  for (const d of DOMAINS) {
    const raw = vals[d.key];
    const x = raw == null || raw === "" ? NaN : Number(raw);
    if (Number.isFinite(x)) { wsum += d.w; acc += d.w * x; }
  }
  return wsum > 0 ? Math.round((acc / wsum) * 100) / 100 : null;
}

/** Direct 4-domain AAI entry for one person×month. Overall is computed live (and authoritatively on
 *  the server). The first month saved becomes that person's baseline automatically. */
export function PersonDomainForm({
  personId, projectId, assessments, onSaved, onDone,
}: {
  personId: string; projectId: string; assessments: PersonAssessmentPoint[];
  onSaved?: () => void; onDone?: (overall: number | null) => void;
}) {
  const router = useRouter();
  const byMonth = useMemo(() => {
    const m = new Map<string, PersonAssessmentPoint>();
    for (const a of assessments) m.set(a.yearMonth, a);
    return m;
  }, [assessments]);

  const prefill = (mo: string): Record<string, string> => {
    const a = byMonth.get(mo);
    return {
      d1: a?.d1 != null ? String(a.d1) : "", d2: a?.d2 != null ? String(a.d2) : "",
      d3: a?.d3 != null ? String(a.d3) : "", d4: a?.d4 != null ? String(a.d4) : "",
    };
  };

  const [month, setMonth] = useState(CURRENT_MONTH);
  const [vals, setVals] = useState<Record<string, string>>(prefill(CURRENT_MONTH));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const onMonth = (mo: string) => { setMonth(mo); setVals(prefill(mo)); setMsg(null); };
  const set = (k: string, v: string) => setVals((p) => ({ ...p, [k]: v }));
  const overall = calcOverall(vals);
  const filledCount = DOMAINS.filter((d) => (vals[d.key] ?? "") !== "").length;
  const anyFilled = filledCount > 0;
  // Defense-in-depth: the server clamps too, but block a 0–100-out-of-range value client-side as well.
  const outOfRange = DOMAINS.some((d) => {
    const raw = vals[d.key];
    if (raw == null || raw === "") return false;
    const x = Number(raw);
    return Number.isFinite(x) && (x < 0 || x > 100);
  });

  const submit = async () => {
    if (outOfRange) { setMsg({ ok: false, text: "คะแนนแต่ละด้านต้องอยู่ระหว่าง 0–100" }); return; }
    setBusy(true);
    setMsg(null);
    try {
      const num = (k: string) => (vals[k] === "" || vals[k] == null ? null : Number(vals[k]));
      const res = await fetch("/api/portal/assess-person", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ personId, projectId, yearMonth: month, d1: num("d1"), d2: num("d2"), d3: num("d3"), d4: num("d4") }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) { setMsg({ ok: false, text: portalErr(j.error) }); return; }
      setMsg({ ok: true, text: `บันทึกแล้ว — คะแนนรวม ${j.overall ?? "—"}` });
      router.refresh();
      onSaved?.();
      // Close the sheet and let the parent surface a confirmation in the list.
      onDone?.(j.overall ?? null);
    } catch {
      setMsg({ ok: false, text: "เกิดข้อผิดพลาด" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink">เดือนที่ประเมิน</label>
        <input type="month" value={month} onChange={(e) => onMonth(e.target.value)} className={fieldCls} disabled={busy} />
        {byMonth.has(month) && (
          <p className="mt-1 text-xs text-warning-fg">มีข้อมูลเดือนนี้อยู่แล้ว — การบันทึกจะทับของเดิม</p>
        )}
      </div>

      <div className="space-y-3">
        {DOMAINS.map((d) => (
          <DomainScoreInput key={d.key} label={d.label} value={vals[d.key] ?? ""}
            onChange={(v) => set(d.key, v)} disabled={busy} />
        ))}
      </div>

      <div className="flex items-center justify-between rounded-card border border-accent/40 bg-accent-soft/40 p-3">
        <span className="text-sm font-medium text-ink">คะแนน AAI รวม (คำนวณอัตโนมัติ)</span>
        <span className="font-display text-xl font-bold text-ink sm:text-2xl">{overall ?? "—"}</span>
      </div>

      {filledCount > 0 && filledCount < 4 && (
        <p className="text-xs text-warning-fg">
          ข้อมูลยังไม่ครบ — กรอก D1–D4 ให้ครบทั้ง 4 ด้าน เพื่อให้ตำบลนับว่า “เสร็จ” (folder เป็นสีเขียว)
        </p>
      )}

      {outOfRange && (
        <p className="text-xs text-danger">คะแนนแต่ละด้านต้องอยู่ระหว่าง 0–100</p>
      )}

      {msg && <p className={`text-sm ${msg.ok ? "text-success-fg" : "text-danger"}`}>{msg.text}</p>}

      <Button variant="accent" className="w-full" disabled={busy || !anyFilled || outOfRange} onClick={submit}>
        {busy ? "กำลังบันทึก…" : "บันทึกคะแนน AAI"}
      </Button>
      <p className="text-center text-xs text-ink-muted">
        การบันทึกเดือนแรกสุดของบุคคลนี้จะถูกใช้เป็นคะแนนตั้งต้น (เริ่มเข้าร่วมโครงการ) โดยอัตโนมัติ
      </p>
    </div>
  );
}
