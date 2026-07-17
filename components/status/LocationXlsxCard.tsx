"use client";

import { useRef, useState } from "react";
import { IconDownload, IconUpload, IconMapPin } from "@tabler/icons-react";

/** Bulk-edit the project's รายชื่อพื้นที่ via Excel (สถานะ/จัดการ portal): download the location list,
 *  edit offline, upload → replace (FK-safe; web_save_locations keeps monitor_project_areas in sync). */
export function LocationXlsxCard({ projectId, canEdit, meName }: {
  projectId: string;
  canEdit: boolean;
  meName: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("projectId", projectId);
      fd.append("editedBy", meName);
      const res = await fetch("/api/upload-locations", { method: "POST", body: fd });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; blocked?: string[]; error?: string };
      if (res.ok && d.ok) {
        const blocked = d.blocked ?? [];
        setMsg(`บันทึกพื้นที่แล้ว ✓${blocked.length ? ` (ลบไม่ได้: ${blocked.join(", ")})` : ""}`);
        setTimeout(() => window.location.reload(), 1200);
      } else setMsg(d.error === "not_contact" ? "ต้องลงทะเบียนเป็นผู้ติดต่อก่อน" : "อัปโหลดไม่สำเร็จ");
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-card bg-surface-soft/60 p-4">
      <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
        <IconMapPin size={18} /> แก้ไขรายชื่อพื้นที่ด้วย Excel
      </div>
      <p className="mb-3 text-xs text-ink-soft">ดาวน์โหลดรายชื่อพื้นที่ (.xlsx) แก้ไขออฟไลน์ แล้วอัปโหลดกลับเพื่อแทนที่ทั้งหมด</p>
      <div className="flex flex-wrap gap-2">
        {canEdit ? (
          <a href={`/api/template/locations/${projectId}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-surface">
            <IconDownload size={16} /> ดาวน์โหลดรายชื่อ
          </a>
        ) : (
          <span aria-disabled className="inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-ink-muted opacity-50">
            <IconDownload size={16} /> ดาวน์โหลดรายชื่อ
          </span>
        )}
        <button onClick={() => fileRef.current?.click()} disabled={busy || !canEdit}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-40">
          <IconUpload size={16} /> {busy ? "กำลังอัปโหลด…" : "อัปโหลดรายชื่อ"}
        </button>
      </div>
      {msg && <p className="mt-2 text-sm font-medium text-ink-soft">{msg}</p>}
      <input ref={fileRef} type="file" accept=".xlsx,.csv,text/csv" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
    </div>
  );
}
