"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { IconDownload, IconUpload, IconFileSpreadsheet } from "@tabler/icons-react";
import { useXlsxUpload } from "@/components/xlsx/useXlsxUpload";
import { errMsg } from "@/components/xlsx/errors";

/** The Excel (offline) entry method for the ส่งข้อมูล portal: download the monthly template, fill it
 *  offline, upload → bulk-submit (matched by จังหวัด/อำเภอ/ตำบล). Same write-path as the grid/form. */
export function MonthlyXlsxCard({ projectId, canEdit, meName }: {
  projectId: string;
  canEdit: boolean;
  meName: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { busy, upload: post } = useXlsxUpload({ endpoint: "/api/upload-submissions", projectId, meName });

  const upload = async (file: File) => {
    setMsg(null);
    const { ok, data: d } = await post(file);
    if (ok) {
      const skipped = Number(d.unmatched ?? 0);
      const ambiguous = Number(d.ambiguous ?? 0);
      setMsg(`ส่งข้อมูล ${d.saved} พื้นที่แล้ว ✓${skipped ? ` (ข้ามที่จับคู่ไม่ได้ ${skipped})` : ""}`
        + (ambiguous ? ` ⚠ มีพื้นที่ชื่อซ้ำ ${ambiguous} แห่ง` : ""));
      setTimeout(() => window.location.reload(), 1200);
    } else setMsg(errMsg(d.error as string | undefined));
  };

  return (
    <div className="space-y-3">
      {!canEdit && (
        <div className="rounded-card border border-warning/40 bg-warning-bg p-2.5 text-xs text-warning-fg">
          ต้อง <Link href="/register" className="font-semibold underline">ลงทะเบียนเป็นผู้ติดต่อ</Link> ก่อนจึงจะดาวน์โหลดแบบฟอร์มและส่งข้อมูลได้ (แบบฟอร์มมีข้อมูลจริงของโครงการ)
        </div>
      )}
      <div className="rounded-card bg-surface-soft/60 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
          <IconFileSpreadsheet size={18} /> กรอกออฟไลน์ด้วย Excel
        </div>
        <p className="mb-3 text-xs text-ink-soft">
          ดาวน์โหลดแบบฟอร์ม (.xlsx) ที่เติมรายชื่อพื้นที่ไว้แล้ว กรอกออฟไลน์ แล้วอัปโหลดกลับเพื่อส่งทั้งหมดในครั้งเดียว
        </p>
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <a href={`/api/template/submissions/${projectId}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-surface">
              <IconDownload size={16} /> ดาวน์โหลดแบบฟอร์ม
            </a>
          ) : (
            <span aria-disabled className="inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-ink-muted opacity-50">
              <IconDownload size={16} /> ดาวน์โหลดแบบฟอร์ม
            </span>
          )}
          <button onClick={() => fileRef.current?.click()} disabled={busy || !canEdit}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-hero px-4 py-2.5 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-40">
            <IconUpload size={16} /> {busy ? "กำลังอัปโหลด…" : "อัปโหลดไฟล์ที่กรอกแล้ว"}
          </button>
        </div>
        {msg && <p className="mt-2 text-sm font-medium text-ink-soft">{msg}</p>}
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.csv,text/csv" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
    </div>
  );
}
