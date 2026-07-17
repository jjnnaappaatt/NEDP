"use client";

import { useRef, useState } from "react";
import { IconDownload, IconUpload, IconFileSpreadsheet, IconAlertTriangle } from "@tabler/icons-react";

type Report = {
  ok: boolean; total: number; valid: number; willEnroll: number; willAssess: number;
  invalid: number; unmatched: number; ambiguous: number; blankSkipped: number; truncated: boolean;
  piiWarning: boolean; sample: { rowNo: number; code: string; tambon: string; action: string; errors: string[] }[];
};

const errMsg = (e?: string) =>
  e === "not_contact" ? "ต้องเป็นผู้รับผิดชอบโครงการ"
    : e === "not_enabled" ? "ยังไม่ได้เปิดใช้งานการนำเข้าข้อมูลรายบุคคล"
      : e === "missing_columns" ? "ไฟล์ไม่มีคอลัมน์ จังหวัด/อำเภอ/ตำบล"
        : e === "empty" ? "ไฟล์ว่าง"
          : e === "no_match" ? "ไม่พบพื้นที่ที่ตรงกับโครงการ"
            : "อัปโหลดไม่สำเร็จ";

/** Bulk per-person intake: download the template → upload to PREVIEW (dry-run report) → confirm to commit.
 *  A preview step is required because rows carry real names (PDPA) and enroll people irreversibly. */
export function PersonsXlsxCard({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const pending = useRef<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const post = async (file: File, mode: "preview" | "commit") => {
    const fd = new FormData();
    fd.append("file", file); fd.append("projectId", projectId); fd.append("mode", mode);
    const res = await fetch("/api/upload-persons", { method: "POST", body: fd });
    return (await res.json().catch(() => ({}))) as Record<string, unknown>;
  };

  const preview = async (file: File) => {
    setBusy(true); setReport(null); setResult(null); pending.current = file;
    try {
      const d = await post(file, "preview");
      if (d.ok) setReport(d as unknown as Report);
      else setResult(errMsg(d.error as string | undefined));
    } finally { setBusy(false); }
  };

  const commit = async () => {
    const file = pending.current; if (!file) return;
    setBusy(true); setResult(null);
    try {
      const d = await post(file, "commit");
      const enrolled = Number(d.enrolled ?? 0), assessed = Number(d.assessed ?? 0);
      if (enrolled > 0 || assessed > 0 || d.ok) {
        const failed = Array.isArray(d.failed) ? d.failed.length : 0;
        const skipped = Number(d.unmatched ?? 0);
        setResult(`นำเข้าสำเร็จ: เพิ่มใหม่ ${enrolled} คน · บันทึกผล ${assessed} รายการ`
          + (failed ? ` · ผิดพลาด ${failed}` : "") + (skipped ? ` · ข้ามพื้นที่ไม่ตรง ${skipped}` : ""));
        setReport(null); pending.current = null;
        setTimeout(() => window.location.reload(), 2200);
      } else setResult(errMsg(d.error as string | undefined));
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      {!canEdit && (
        <div className="rounded-card border border-warning/40 bg-warning-bg p-2.5 text-xs text-warning-fg">
          ต้องเป็นผู้รับผิดชอบโครงการจึงจะนำเข้าข้อมูลรายบุคคลได้
        </div>
      )}
      <div className="rounded-card bg-surface-soft/60 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
          <IconFileSpreadsheet size={18} /> นำเข้าข้อมูลรายบุคคล (Excel)
        </div>
        <p className="mb-3 text-xs text-ink-soft">
          ดาวน์โหลดแบบฟอร์ม (1 แถว = 1 คน) กรอกออฟไลน์ อัปโหลดเพื่อ<b>ตรวจสอบก่อน</b> แล้วจึงยืนยันบันทึก — ระบบคำนวณ AAI ให้อัตโนมัติ
        </p>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/template/persons/${projectId}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-surface">
            <IconDownload size={16} /> ดาวน์โหลดแบบฟอร์ม
          </a>
          <button onClick={() => fileRef.current?.click()} disabled={busy || !canEdit}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-hero px-4 py-2.5 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-40">
            <IconUpload size={16} /> {busy && !report ? "กำลังตรวจสอบ…" : "อัปโหลดเพื่อตรวจสอบ"}
          </button>
        </div>
        {result && <p className="mt-2 text-sm font-medium text-ink-soft">{result}</p>}

        {report && (
          <div className="mt-3 rounded-card border border-border bg-surface p-3 text-sm">
            <div className="mb-2 font-semibold text-ink">ผลการตรวจสอบก่อนนำเข้า</div>
            <div className="grid grid-cols-2 gap-1 text-xs text-ink-soft sm:grid-cols-4">
              <span>ทั้งหมด: <b className="text-ink">{report.total}</b></span>
              <span>เพิ่มใหม่: <b className="text-success-fg">{report.willEnroll}</b></span>
              <span>อัปเดต: <b className="text-ink">{report.willAssess}</b></span>
              <span>ไม่ถูกต้อง: <b className="text-warning-fg">{report.invalid}</b></span>
              {report.unmatched > 0 && <span>พื้นที่ไม่ตรง: <b className="text-warning-fg">{report.unmatched}</b></span>}
              {report.ambiguous > 0 && <span>พื้นที่ชื่อซ้ำ: <b className="text-warning-fg">{report.ambiguous}</b></span>}
              {report.blankSkipped > 0 && <span>ข้ามแถวว่าง: <b className="text-ink">{report.blankSkipped}</b></span>}
            </div>
            {report.piiWarning && (
              <div className="mt-2 flex items-start gap-1.5 rounded border border-warning/40 bg-warning-bg p-2 text-xs text-warning-fg">
                <IconAlertTriangle size={14} className="mt-0.5 shrink-0" />
                ไฟล์มีชื่อ–สกุลจริง (ข้อมูลส่วนบุคคล) — ระบบจะจัดเก็บแบบเข้ารหัส ไม่แสดงบนแดชบอร์ด/รายงาน
              </div>
            )}
            {report.sample.some((s) => s.errors.length > 0) && (
              <div className="mt-2 max-h-40 overflow-auto text-xs">
                {report.sample.filter((s) => s.errors.length > 0).map((s) => (
                  <div key={s.rowNo} className="border-t border-border/60 py-1 text-ink-soft">
                    <span className="font-medium text-warning-fg">แถว {s.rowNo}</span> ({s.tambon}): {s.errors.join(" · ")}
                  </div>
                ))}
              </div>
            )}
            {report.truncated && <p className="mt-2 text-xs text-warning-fg">ไฟล์ใหญ่เกินกำหนด — โปรดแบ่งไฟล์แล้วนำเข้าทีละส่วน</p>}
            <div className="mt-3 flex gap-2">
              <button onClick={commit} disabled={busy || report.valid === 0}
                className="rounded-lg bg-hero px-4 py-2 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-40">
                {busy ? "กำลังนำเข้า…" : `ยืนยันนำเข้า ${report.valid} คน`}
              </button>
              <button onClick={() => { setReport(null); pending.current = null; }}
                className="rounded-lg border border-border px-4 py-2 text-sm text-ink-soft hover:bg-surface">ยกเลิก</button>
            </div>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.csv,text/csv" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) preview(f); e.target.value = ""; }} />
    </div>
  );
}
