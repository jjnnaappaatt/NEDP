"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { IconClockHour4, IconClipboardList, IconUpload } from "@tabler/icons-react";
import { SURVEY_EXAMPLES } from "@/lib/questionnaire/surveys/examples";
import { QuestionnairePreview } from "./QuestionnairePreview";
import { validateRawSurvey } from "@/lib/questionnaire/surveyCore";
import { cn } from "@/lib/utils";

const field = "w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent";

/** Full format verification — identical to the server's validateRawSurvey (surveyCore is client-safe). */
type Check = { ok: true; title: string; count: number } | { ok: false; error: string } | null;
function check(json: string): Check {
  if (!json.trim()) return null;
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { return { ok: false, error: "ไฟล์นี้ไม่ใช่ JSON ที่ถูกต้อง" }; }
  const err = validateRawSurvey(raw);
  if (err) return { ok: false, error: err };
  const r = raw as { title?: string; questions?: unknown[] };
  return { ok: true, title: String(r.title ?? "(ไม่มีชื่อ)"), count: Array.isArray(r.questions) ? r.questions.length : 0 };
}

/** Head-side: submit a custom questionnaire (JSON) for this project → pending admin approval. Mirrors
 *  IntegrationRequestCard; on approve the admin's flow creates + assigns it. */
export function RequestQuestionnaireCard({ projectId, canEdit, pending }: {
  projectId: string; canEdit: boolean; pending: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [includeAai, setIncludeAai] = useState(true);
  const [json, setJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"idle" | "pending" | "error">(pending ? "pending" : "idle");
  const [err, setErr] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const pv = check(json);

  const loadExample = (key: string) => {
    const ex = SURVEY_EXAMPLES.find((e) => e.key === key);
    if (!ex) return;
    setJson(JSON.stringify(ex.raw, null, 2));
    setTitle((ex.raw as { title?: string }).title ?? "");
  };

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/request-questionnaire", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, title, includeAai, json }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && d.ok) setState("pending");
      else { setState("error"); setErr(d.error === "exists" ? "มีคำขอที่รอการอนุมัติอยู่แล้ว" : d.error ?? "ส่งคำขอไม่สำเร็จ"); }
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
        <IconClipboardList size={18} /> ขอเพิ่มแบบสอบถามเฉพาะของโครงการ
      </div>
      {state === "pending" ? (
        <p className="flex items-center gap-1.5 text-sm text-warning-fg">
          <IconClockHour4 size={16} /> ส่งคำขอแล้ว — รอหัวหน้าโครงการอนุมัติ
        </p>
      ) : !canEdit ? (
        <p className="text-sm text-ink-soft">
          ต้อง<Link href="/register" className="font-semibold underline">ลงทะเบียนเป็นผู้รับผิดชอบโครงการ</Link>ก่อน จึงจะขอเพิ่มแบบสอบถามได้
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-ink-soft">
            ส่งแบบสอบถามของโครงการ (รูปแบบ JSON — <code>{`{ "title", "questions": [{ "id","text","type","options" }] }`}</code>) ให้หัวหน้าโครงการตรวจสอบ
            เมื่ออนุมัติ ระบบจะสร้างฟอร์ม/ไฟล์ Excel/คู่มือให้อัตโนมัติ
          </p>
          <div className="flex flex-wrap gap-2">
            <select onChange={(e) => { if (e.target.value) loadExample(e.target.value); e.target.value = ""; }} className={cn(field, "max-w-xs")} defaultValue="">
              <option value="">— โหลดตัวอย่าง —</option>
              {SURVEY_EXAMPLES.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
            </select>
            <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-card border border-border px-3 py-2 text-sm text-ink-soft hover:bg-surface-soft">
              <IconUpload size={16} /> อัปโหลด .json
            </button>
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="ชื่อแบบสอบถาม" />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={includeAai} onChange={(e) => setIncludeAai(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            รวมส่วนคำนวณ AAI (ข้อมูลทั่วไป + คำถาม AAI) — แนะนำ
          </label>
          <textarea value={json} onChange={(e) => { setJson(e.target.value); setFileName(null); }} rows={7} className={cn(field, "font-mono text-xs")} placeholder='{ "title": "…", "questions": [ … ] }' />
          {fileName && <p className="text-xs text-ink-muted">ตรวจสอบไฟล์: {fileName}</p>}
          {pv && (pv.ok
            ? <p className="text-xs text-success-fg">✓ รูปแบบถูกต้อง — {pv.title} · {pv.count} ข้อ{includeAai ? " (+ ส่วน AAI)" : ""}</p>
            : <p className="text-xs text-warning-fg">✗ รูปแบบไม่ถูกต้อง: {pv.error}</p>)}
          {json.trim() && <QuestionnairePreview json={json} includeAai={includeAai} />}
          {err && <p className="text-sm text-warning-fg">{err}</p>}
          <button onClick={submit} disabled={busy || !(pv && pv.ok)}
            className="rounded-lg bg-hero px-4 py-2.5 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-40">
            {busy ? "กำลังส่งคำขอ…" : "ส่งคำขอเพิ่มแบบสอบถาม"}
          </button>
        </div>
      )}
      <input ref={fileRef} type="file" accept=".json,.txt,application/json,text/plain" className="hidden"
        onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const t = await f.text(); setJson(t); setFileName(f.name); try { const r = JSON.parse(t); if (r.title) setTitle(String(r.title)); } catch { /* verdict shows the error */ } } e.target.value = ""; }} />
    </div>
  );
}
