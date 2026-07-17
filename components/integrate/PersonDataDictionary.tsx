import { PERSON_COLUMNS, AAI_DOMAIN_LABEL, type PersonFieldKind } from "@/lib/factPersons";

const GROUPS: { kind: PersonFieldKind; title: string }[] = [
  { kind: "identity", title: "ข้อมูลระบุตัวตน / ความยินยอม" },
  { kind: "meta", title: "ข้อมูลพื้นฐาน (ใช้คำนวณ)" },
  { kind: "aai_q", title: "แบบสอบถาม AAI (ข้อมูลทั่วไป)" },
  { kind: "tool", title: "คะแนนเครื่องมือคัดกรอง" },
  { kind: "gap", title: "★ ข้อคำถามใหม่ (เติมช่องว่าง AAI)" },
];

/** Field-by-field data dictionary for the per-person template — identical content to the Excel
 *  "คำอธิบาย" sheet, driven by lib/factPersons.PERSON_COLUMNS so the two can't drift. */
export function PersonDataDictionary() {
  return (
    <div className="space-y-4">
      {GROUPS.map((g) => {
        const cols = PERSON_COLUMNS.filter((c) => c.kind === g.kind);
        if (!cols.length) return null;
        return (
          <div key={g.kind}>
            <div className="mb-1 text-sm font-semibold text-ink">{g.title}</div>
            <div className="overflow-x-auto rounded-card border border-border">
              <table className="w-full min-w-[560px] text-xs">
                <thead>
                  <tr className="bg-surface-soft text-ink-soft">
                    <th className="px-2 py-1.5 text-left font-medium">คอลัมน์</th>
                    <th className="px-2 py-1.5 text-left font-medium">ช่วงค่า / รหัส</th>
                    <th className="px-2 py-1.5 text-left font-medium">ตัวชี้วัด AAI</th>
                    <th className="px-2 py-1.5 text-left font-medium">คำอธิบาย</th>
                  </tr>
                </thead>
                <tbody>
                  {cols.map((c) => (
                    <tr key={c.key} className="border-t border-border/60 align-top">
                      <td className="px-2 py-1.5 font-medium text-ink">{c.th}{c.required ? " *" : ""}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-ink-soft">
                        {c.enumMap ? [...new Set(Object.keys(c.enumMap))].join(" / ") : c.min != null && c.max != null ? `${c.min}–${c.max}` : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-ink-soft">
                        {c.indicator ? `${c.indicator}${c.domain ? ` · ${AAI_DOMAIN_LABEL[c.domain]}` : ""}` : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-ink-soft">{c.help}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
