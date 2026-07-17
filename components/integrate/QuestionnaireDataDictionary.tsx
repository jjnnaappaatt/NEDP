import { schemaToColumns, colRangeText } from "@/lib/questionnaire/columns";
import type { QuestionnaireSchema } from "@/lib/questionnaire/schema";

/** Field-by-field data dictionary for the ASSIGNED questionnaire — same columns as its Excel template
 *  ("คำอธิบาย" sheet), driven by schemaToColumns so the two can't drift. Grouped identity block +
 *  questionnaire questions. Server component (pure). */
export function QuestionnaireDataDictionary({ schema, modules }: { schema: QuestionnaireSchema; modules: string[] }) {
  const cols = schemaToColumns(schema, modules);
  const groups = [
    { title: "ข้อมูลระบุตัวตน / พื้นที่ / ความยินยอม", cols: cols.filter((c) => c.kind === "identity") },
    { title: "คำถามในแบบสอบถาม", cols: cols.filter((c) => c.kind === "question") },
  ];
  return (
    <div className="space-y-4">
      {groups.map((g) => g.cols.length ? (
        <div key={g.title}>
          <div className="mb-1 text-sm font-semibold text-ink">{g.title}</div>
          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full min-w-[520px] text-xs">
              <thead>
                <tr className="bg-surface-soft text-ink-soft">
                  <th className="px-2 py-1.5 text-left font-medium">คอลัมน์</th>
                  <th className="px-2 py-1.5 text-left font-medium">ค่าที่รับ</th>
                  <th className="px-2 py-1.5 text-left font-medium">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {g.cols.map((c) => (
                  <tr key={c.key} className="border-t border-border/60 align-top">
                    <td className="px-2 py-1.5 font-medium text-ink">{c.th}{c.required ? " *" : ""}</td>
                    <td className="px-2 py-1.5 text-ink-soft">{colRangeText(c) || (c.qtype === "text" ? "ข้อความ" : "—")}</td>
                    <td className="px-2 py-1.5 text-ink-soft">{c.help ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null)}
    </div>
  );
}
