"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconUpload, IconFileImport, IconClipboardList } from "@tabler/icons-react";
import { SURVEY_EXAMPLES } from "@/lib/questionnaire/surveys/examples";
import { QuestionnairePreview } from "@/components/integrate/QuestionnairePreview";
import { QuestionnaireForm } from "@/components/questionnaire/QuestionnaireForm";
import { validateRawSurvey } from "@/lib/questionnaire/surveyCore";
import type { QuestionnaireInfo } from "@/lib/data";
import type { QuestionnaireSchema } from "@/lib/questionnaire/schema";
import { cn } from "@/lib/utils";

const noop = () => {};

const field = "w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent";
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9ก-๙]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

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

/** Admin questionnaire registry: list existing + import a new one from the JSON format (the 5 examples). */
export function QuestionnaireManager({ initial }: { initial: QuestionnaireInfo[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [includeAai, setIncludeAai] = useState(true);
  const [json, setJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const pv = check(json);
  const [selected, setSelected] = useState<{ schema: QuestionnaireSchema; title: string } | null>(null);
  const [previewBusy, setPreviewBusy] = useState<string | null>(null);

  const showExisting = async (q: QuestionnaireInfo) => {
    setPreviewBusy(q.id);
    try {
      const res = await fetch(`/api/admin/questionnaires/${q.id}`);
      const d = (await res.json().catch(() => ({}))) as { schema?: QuestionnaireSchema };
      if (d.schema) setSelected({ schema: d.schema, title: q.title });
    } finally { setPreviewBusy(null); }
  };

  const loadExample = (key: string) => {
    const ex = SURVEY_EXAMPLES.find((e) => e.key === key);
    if (!ex) return;
    const text = JSON.stringify(ex.raw, null, 2);
    setJson(text);
    const t = (ex.raw as { title?: string }).title ?? "";
    setTitle(t); setCode(slug(t) || `survey-${key}`); setMsg(null);
  };

  const onTitle = (v: string) => { setTitle(v); if (!code || code === slug(title)) setCode(slug(v)); };

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/questionnaires/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, code, includeAai, json }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.ok) {
        setMsg(`บันทึกแล้ว: ${d.title} (${d.questions} ข้อ${d.includeAai ? " + ส่วน AAI" : ""})`);
        setJson(""); setTitle(""); setCode("");
        router.refresh();
      } else setMsg(`ผิดพลาด: ${d.error ?? "บันทึกไม่สำเร็จ"}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      {/* Import panel */}
      <section className="space-y-3 rounded-card border border-border bg-surface p-4">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <IconFileImport size={18} /> สร้างแบบสอบถามใหม่ (นำเข้า JSON)
        </div>
        <p className="text-xs text-ink-soft">
          วางหรืออัปโหลดแบบสอบถามในรูปแบบ JSON — <code>{`{ "title": …, "questions": [{ "id", "text", "type", "options" }] }`}</code>.
          เลือก “รวมส่วนคำนวณ AAI” เพื่อให้ระบบคำนวณคะแนน AAI ให้อัตโนมัติ (ข้อคำถามเฉพาะโครงการจะถูกจัดเก็บไว้)
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <select onChange={(e) => { if (e.target.value) loadExample(e.target.value); e.target.value = ""; }} className={cn(field, "max-w-xs")} defaultValue="">
            <option value="">— โหลดตัวอย่าง —</option>
            {SURVEY_EXAMPLES.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
          </select>
          <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-card border border-border px-3 py-2 text-sm text-ink-soft hover:bg-surface-soft">
            <IconUpload size={16} /> อัปโหลด .json
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-ink-soft">ชื่อแบบสอบถาม
            <input value={title} onChange={(e) => onTitle(e.target.value)} className={cn(field, "mt-1")} placeholder="ชื่อโครงการ / แบบสอบถาม" />
          </label>
          <label className="text-xs text-ink-soft">รหัส (code — ไม่ซ้ำกัน)
            <input value={code} onChange={(e) => setCode(e.target.value)} className={cn(field, "mt-1")} placeholder="เช่น survey-16" />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={includeAai} onChange={(e) => setIncludeAai(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          รวมส่วนคำนวณ AAI (ข้อมูลทั่วไป + คำถาม AAI) — แนะนำ
        </label>

        <textarea value={json} onChange={(e) => { setJson(e.target.value); setFileName(null); }} rows={8}
          className={cn(field, "font-mono text-xs")} placeholder='{ "title": "…", "questions": [ … ] }' />

        {fileName && <p className="text-xs text-ink-muted">ตรวจสอบไฟล์: {fileName}</p>}
        {pv && (pv.ok
          ? <p className="text-xs text-success-fg">✓ รูปแบบถูกต้อง — {pv.title} · {pv.count} ข้อ{includeAai ? " (+ ส่วน AAI)" : ""}</p>
          : <p className="text-xs text-warning-fg">✗ รูปแบบไม่ถูกต้อง: {pv.error}</p>)}
        {json.trim() && <QuestionnairePreview json={json} includeAai={includeAai} />}
        {msg && <p className="text-sm font-medium text-ink-soft">{msg}</p>}

        <button onClick={save} disabled={busy || !code.trim() || !(pv && pv.ok)}
          className="rounded-card bg-hero px-4 py-2 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-40">
          {busy ? "กำลังบันทึก…" : "บันทึกแบบสอบถาม"}
        </button>
      </section>

      {/* Existing */}
      <section className="space-y-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <IconClipboardList size={18} /> แบบสอบถามในระบบ ({initial.length})
        </div>
        {initial.length === 0 ? (
          <p className="text-sm text-ink-muted">ยังไม่มีแบบสอบถาม — นำเข้าด้านบน</p>
        ) : (
          <div className="divide-y divide-border/60 rounded-card border border-border bg-surface">
            {initial.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="min-w-0"><b className="text-ink">{q.title}</b> <span className="text-ink-muted">· {q.code} {q.version}</span></span>
                <span className="flex shrink-0 items-center gap-2">
                  <button onClick={() => showExisting(q)} disabled={previewBusy === q.id}
                    className="rounded-card border border-border px-2 py-0.5 text-xs text-ink-soft hover:bg-surface-soft disabled:opacity-40">
                    {previewBusy === q.id ? "กำลังโหลด…" : "ดูตัวอย่าง"}
                  </button>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs", q.kind === "clinical" ? "bg-accent-soft text-ink-accent" : "bg-surface-soft text-ink-soft")}>{q.kind === "clinical" ? "คลินิก" : "แบบสอบถาม"}</span>
                </span>
              </div>
            ))}
          </div>
        )}
        {selected && (
          <div className="space-y-2 rounded-card border border-accent/30 bg-accent-soft/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink">ตัวอย่างแบบสอบถามจริง: {selected.title}</span>
              <button onClick={() => setSelected(null)} className="rounded-card border border-border px-2 py-0.5 text-xs text-ink-soft hover:bg-surface-soft">ปิด</button>
            </div>
            <QuestionnaireForm schema={selected.schema} modules={[]} preview onSubmit={noop} />
          </div>
        )}
        <p className="text-xs text-ink-muted">กำหนดแบบสอบถามให้แต่ละโครงการได้ที่หน้า “โครงการ”</p>
      </section>

      <input ref={fileRef} type="file" accept=".json,.txt,application/json,text/plain" className="hidden"
        onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const t = await f.text(); setJson(t); setFileName(f.name); try { const r = JSON.parse(t); if (r.title) onTitle(String(r.title)); } catch { /* verdict shows the error */ } } e.target.value = ""; }} />
    </div>
  );
}
