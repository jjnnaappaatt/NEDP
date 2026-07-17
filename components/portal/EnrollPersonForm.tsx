"use client";

import { useState } from "react";
import { IconCircleCheck, IconUserPlus, IconUsers } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";
import { fieldCls, portalErr } from "./fieldStyles";

const AGE_BANDS = ["50-54", "55-59", "60-64", "65-69", "70-74", "75+"];
const SEXES = [{ v: "F", l: "หญิง" }, { v: "M", l: "ชาย" }, { v: "other", l: "อื่น ๆ" }];
const EDU = [
  { v: 0, l: "ไม่ได้เรียน" }, { v: 1, l: "ประถม" }, { v: 2, l: "มัธยม" },
  { v: 3, l: "อนุปริญญา" }, { v: 4, l: "ปริญญาตรีขึ้นไป" },
];
const OCC = [
  { v: 0, l: "ไม่ได้ทำงาน" }, { v: 1, l: "รับจ้าง/ลูกจ้าง" },
  { v: 2, l: "ค้าขาย/ธุรกิจส่วนตัว" }, { v: 3, l: "เกษตรกร" }, { v: 4, l: "อื่น ๆ" },
];

/** Enroll a NEW elderly person into this project+tambon. The รหัสผู้เข้าร่วม is auto-assigned server-side
 *  (tambon-scoped running number); the name is encrypted server-side. On success we DON'T open the score
 *  form — the person lands in รายชื่อ/ค้นหา, ready to score via its "กรอกข้อมูล AAI" button. This form shows
 *  an inline success state so staff can register a whole batch (＋ เพิ่มคนถัดไป) before scoring. */
export function EnrollPersonForm({
  projectId, tambonCode, onEnrolled, onViewList,
}: { projectId: string; tambonCode: string; onEnrolled: () => void; onViewList: () => void }) {
  const [name, setName] = useState("");
  const [sex, setSex] = useState("");
  const [age, setAge] = useState("");
  const [edu, setEdu] = useState("");
  const [occ, setOcc] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ personCode: string; name: string } | null>(null);

  const canSubmit = consent && !busy;

  const resetForm = () => {
    setName(""); setSex(""); setAge(""); setEdu(""); setOcc(""); setConsent(false);
    setErr(null); setDone(null);
  };

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/portal/enroll-person", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId, tambonCode, fullName: name.trim() || undefined,
          sex: sex || undefined, ageBand: age || undefined,
          education: edu === "" ? undefined : Number(edu),
          occupation: occ === "" ? undefined : Number(occ),
          consentVersion: "v1",
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) { setErr(portalErr(j.error)); return; }
      setDone({ personCode: String(j.personCode ?? "—"), name: name.trim() });
      onEnrolled(); // refresh the list + folder status
    } catch {
      setErr("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex flex-col items-center gap-2 py-2">
          <IconCircleCheck size={44} className="text-accent" />
          <p className="text-base font-medium text-ink">
            เพิ่มผู้สูงอายุแล้ว{done.name ? ` · ${done.name}` : ""}
          </p>
          <p className="text-sm text-ink-soft">
            รหัสผู้เข้าร่วม <span className="font-display text-lg font-bold text-ink">{done.personCode}</span>
          </p>
          <p className="text-xs text-ink-muted">กำหนดให้อัตโนมัติ — ไปกรอกคะแนน AAI ได้ที่แท็บ “รายชื่อ/ค้นหา”</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="accent" className="flex-1" onClick={resetForm}>
            <IconUserPlus size={18} className="-ml-0.5" /> เพิ่มคนถัดไป
          </Button>
          <Button variant="secondary" className="flex-1" onClick={onViewList}>
            <IconUsers size={18} className="-ml-0.5" /> ดูรายชื่อ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink">ชื่อ–สกุล (สำหรับการอ้างอิงในโครงการ)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls}
          placeholder="ชื่อจริง นามสกุล" disabled={busy} />
        <p className="mt-1 text-xs text-ink-muted">
          เก็บแบบเข้ารหัส เห็นเฉพาะผู้รับผิดชอบโครงการ และมีบันทึกการเข้าถึง · รหัสผู้เข้าร่วมจะกำหนดให้อัตโนมัติ
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">เพศ</label>
          <select value={sex} onChange={(e) => setSex(e.target.value)} className={fieldCls} disabled={busy}>
            <option value="">— เลือก —</option>
            {SEXES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">ช่วงอายุ</label>
          <select value={age} onChange={(e) => setAge(e.target.value)} className={fieldCls} disabled={busy}>
            <option value="">— เลือก —</option>
            {AGE_BANDS.map((a) => <option key={a} value={a}>{a} ปี</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">การศึกษา</label>
          <select value={edu} onChange={(e) => setEdu(e.target.value)} className={fieldCls} disabled={busy}>
            <option value="">— เลือก —</option>
            {EDU.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">อาชีพ</label>
          <select value={occ} onChange={(e) => setOcc(e.target.value)} className={fieldCls} disabled={busy}>
            <option value="">— เลือก —</option>
            {OCC.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
      </div>

      <label className="flex items-start gap-2.5 rounded-card border border-border bg-surface-soft/50 p-3">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent)]" disabled={busy} />
        <span className="text-sm text-ink-soft">
          ได้รับความยินยอม (consent) จากผู้สูงอายุ/ผู้ดูแลในการเก็บและประมวลผลข้อมูลตาม PDPA
        </span>
      </label>

      {err && <p className="text-sm text-danger">{err}</p>}

      <Button variant="accent" className="w-full" disabled={!canSubmit} onClick={submit}>
        {busy ? "กำลังบันทึก…" : "เพิ่มผู้สูงอายุ"}
      </Button>
    </div>
  );
}
