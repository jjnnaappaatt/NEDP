import type { PersonRow, TambonPersonDetail, PersonAssessmentPoint } from "@/lib/data";

/** Client-only sample people for the รายบุคคล drill in Demo mode (real person data is empty). Never written. */
export const DEMO_PERSONS: PersonRow[] = [
  { personId: "demo-1", personCode: "HN-1001", fullName: null, tambonCode: "", tambonTh: "บ้านไร่", sex: "หญิง", ageBand: "60-64", latestMonth: "2026-07", latestOverall: 58.2, hasClinicalFlag: false },
  { personId: "demo-2", personCode: "HN-1002", fullName: null, tambonCode: "", tambonTh: "บ้านไร่", sex: "ชาย", ageBand: "70-74", latestMonth: "2026-07", latestOverall: 47.9, hasClinicalFlag: true },
  { personId: "demo-3", personCode: "HN-1003", fullName: null, tambonCode: "", tambonTh: "บ้านไร่", sex: "หญิง", ageBand: "55-59", latestMonth: "2026-07", latestOverall: 63.5, hasClinicalFlag: false },
  { personId: "demo-4", personCode: "HN-1004", fullName: null, tambonCode: "", tambonTh: "บ้านไร่", sex: "ชาย", ageBand: "65-69", latestMonth: null, latestOverall: null, hasClinicalFlag: false },
];

/** Synthesize a baseline→latest timeline for a demo person from their latest overall. */
export function demoDetailFor(code: string): TambonPersonDetail {
  const p = DEMO_PERSONS.find((x) => x.personCode === code) ?? DEMO_PERSONS[0];
  const assessments: PersonAssessmentPoint[] = [];
  if (p.latestOverall != null) {
    const latest = p.latestOverall;
    const base = Math.round((latest - 9.4) * 10) / 10;
    const pt = (o: number, isBaseline: boolean, isLatest: boolean, ym: string): PersonAssessmentPoint => ({
      yearMonth: ym, d1: Math.round((o - 6) * 10) / 10, d2: Math.round((o - 2) * 10) / 10,
      d3: Math.round((o + 3) * 10) / 10, d4: Math.round((o + 5) * 10) / 10, overall: o, isBaseline, isLatest,
    });
    assessments.push(pt(base, true, false, "2026-04"), pt(latest, false, true, "2026-07"));
  }
  return { personId: p.personId, personCode: p.personCode, projectId: "demo", tambonTh: p.tambonTh, sex: p.sex, ageBand: p.ageBand, assessments };
}
