"use client";

import { useState } from "react";
import { IconDownload } from "@tabler/icons-react";
import { QuestionnairePreview } from "./QuestionnairePreview";

/** Default mockup demonstrating every question type (scale_5 / radio / number / checkbox_multi) + a
 *  declared specific score. Users edit it and watch the real form update live. */
const DEFAULT_EXAMPLE = `{
  "title": "แบบสอบถามความพึงพอใจโครงการ (ตัวอย่าง)",
  "questions": [
    { "id": 1, "text": "ท่านพึงพอใจภาพรวมของกิจกรรมเพียงใด", "type": "scale_5",
      "options": [
        { "value": 5, "label": "มากที่สุด" }, { "value": 4, "label": "มาก" },
        { "value": 3, "label": "ปานกลาง" }, { "value": 2, "label": "น้อย" }, { "value": 1, "label": "น้อยที่สุด" }
      ] },
    { "id": 2, "text": "ท่านเคยเข้าร่วมโครงการมาก่อนหรือไม่", "type": "radio",
      "options": [ { "value": 1, "label": "เคย" }, { "value": 0, "label": "ไม่เคย" } ] },
    { "id": 3, "text": "จำนวนครั้งที่เข้าร่วมกิจกรรม", "type": "number", "min": 0, "max": 30 },
    { "id": 4, "text": "กิจกรรมที่ท่านสนใจ (เลือกได้หลายข้อ)", "type": "checkbox_multi",
      "options": [
        { "value": "exercise", "label": "ออกกำลังกาย" },
        { "value": "nutrition", "label": "โภชนาการ" },
        { "value": "social", "label": "กิจกรรมสังคม" }
      ] }
  ],
  "scores": [
    { "key": "satisfaction", "label": "ความพึงพอใจรวม",
      "questions": [1], "agg": "mean", "min": 1, "max": 5 }
  ]
}`;

/** Interactive format demo for the guide: an editable JSON box + a live "real questionnaire" preview,
 *  plus a .txt download so users can edit offline in any text editor and re-import. */
export function QuestionnaireFormatDemo() {
  const [json, setJson] = useState(DEFAULT_EXAMPLE);
  const downloadTxt = () => {
    const blob = new Blob([json], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "แบบฟอร์มแบบสอบถาม.txt";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>ทดลองแก้ไข JSON ด้านล่าง แล้วดูตัวอย่างแบบสอบถามจริงแบบทันที (คัดลอกไปปรับใช้ได้):</p>
        <button onClick={downloadTxt} type="button"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-card border border-border px-3 py-1.5 text-xs text-ink-soft hover:bg-surface-soft">
          <IconDownload size={15} /> ดาวน์โหลดแบบฟอร์ม (.txt)
        </button>
      </div>
      <textarea value={json} onChange={(e) => setJson(e.target.value)} rows={12} spellCheck={false}
        className="w-full rounded-card border border-border bg-surface px-3 py-2 font-mono text-xs leading-relaxed text-ink outline-none focus:border-accent" />
      <QuestionnairePreview json={json} />
    </div>
  );
}
