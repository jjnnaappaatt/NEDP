/**
 * Thai-Adapted AAI model (2567) — the 19-indicator reference spec.
 *
 * DORMANT / "lurking": this module is the canonical TypeScript transcription of the interactive
 * calculator in `public/manual/aai-dashboard.html` (its `var D`). It is imported by NOTHING in the
 * scoring or runtime path. Production AAI is owned by the SQL trigger
 * (fn_score_person_assessment → aai_derive_indicators → aai_score_indicators), which currently uses
 * the 22-indicator per-person structure with the Thai-Adapted overall weights 30/15/30/25.
 *
 * It is kept here, ready, as the earmarked model for a future **import-questionnaire** AAI calc
 * (the /integrate path — see `lib/questionnaire/derive.ts`). Switching it on for per-person scoring
 * is deferred pending three modeling/data decisions:
 *   (a) D1 is a weighted average of 4 age bands — meaningful on aggregates, not one individual;
 *   (b) `home_ownership` (h6) has no question/column/data source today;
 *   (c) D4 c1 needs life-expectancy-at-60, but the geo data provides only at-55.
 *
 * Sources: UNECE Active Ageing Index (2019) · ASEAN AAI · สำนักงานสถิติแห่งชาติ (2567).
 * National base score (2564 defaults): 64.6.
 */

export interface AaiIndicator19 {
  /** stable id (matches aai-dashboard.html) */
  id: string;
  /** Thai label shown to users */
  label: string;
  /** inner weight within its domain (a domain's inner weights sum to 1.0) */
  weight: number;
  /** national default value, ข้อมูลปี 2564 (0–100) */
  default2564: number;
}

export interface AaiDomain19 {
  key: "d1" | "d2" | "d3" | "d4";
  /** Thai domain name */
  name: string;
  /** English (UNECE-style) domain name */
  nameEn: string;
  /** domain weight in the overall AAI (the four sum to 1.0) */
  weight: number;
  indicators: AaiIndicator19[];
}

/** 4 domains · 19 indicators · weights 30/15/30/25. Transcribed verbatim from aai-dashboard.html `var D`. */
export const THAI_ADAPTED_19: readonly AaiDomain19[] = [
  {
    key: "d1", name: "การมีงานทำ", nameEn: "Employment", weight: 0.30,
    indicators: [
      { id: "e1", label: "มีงานทำ อายุ 55–59", weight: 0.50, default2564: 76.9 },
      { id: "e2", label: "มีงานทำ อายุ 60–64", weight: 0.30, default2564: 57.3 },
      { id: "e3", label: "มีงานทำ อายุ 65–69", weight: 0.15, default2564: 44.9 },
      { id: "e4", label: "มีงานทำ อายุ 70–74", weight: 0.05, default2564: 26.1 },
    ],
  },
  {
    key: "d2", name: "การมีส่วนร่วม", nameEn: "Participation", weight: 0.15,
    indicators: [
      { id: "p1", label: "เข้าร่วมกลุ่ม/ชมรม", weight: 0.30, default2564: 36.7 },
      { id: "p2", label: "ดูแลหลาน/ผู้ป่วย/ผู้สูงอายุ", weight: 0.40, default2564: 38.6 },
      { id: "p3", label: "ร่วมวันสำคัญของชุมชน", weight: 0.30, default2564: 49.4 },
    ],
  },
  {
    key: "d3", name: "สุขภาพดีและความมั่นคง", nameEn: "Independent Living", weight: 0.30,
    indicators: [
      { id: "h1", label: "ออกกำลังกาย", weight: 0.10, default2564: 40.0 },
      { id: "h2", label: "เข้าถึงบริการสุขภาพ/ช่วยเหลือ", weight: 0.20, default2564: 83.5 },
      { id: "h3", label: "ทำกิจวัตรได้ดี (ADLs)", weight: 0.25, default2564: 74.5 },
      { id: "h4", label: "รายได้เพียงพอ", weight: 0.15, default2564: 58.2 },
      { id: "h5", label: "ไม่ขัดสนทางวัตถุ", weight: 0.10, default2564: 88.2 },
      { id: "h6", label: "เจ้าของที่อยู่อาศัย", weight: 0.20, default2564: 79.5 },
    ],
  },
  {
    key: "d4", name: "ศักยภาพและสภาพแวดล้อม", nameEn: "Capacity", weight: 0.25,
    indicators: [
      { id: "c1", label: "อายุคาดเฉลี่ยที่อายุ 60", weight: 0.20, default2564: 47.8 },
      { id: "c2", label: "สัดส่วนปีสุขภาพดี", weight: 0.30, default2564: 74.9 },
      { id: "c3", label: "สุขภาพจิตดี", weight: 0.20, default2564: 86.8 },
      { id: "c4", label: "ติดต่อบุตรนอกครัวเรือน", weight: 0.10, default2564: 97.3 },
      { id: "c5", label: "ใช้อินเทอร์เน็ต", weight: 0.15, default2564: 65.0 },
      { id: "c6", label: "สำเร็จการศึกษา", weight: 0.05, default2564: 18.3 },
    ],
  },
] as const;

/** National base AAI computed from the 2564 defaults — the calculator's anchor (≈ 64.57 → 64.6). */
export const THAI_ADAPTED_19_BASE = 64.6;

/** Provenance line, matching the manual + the dashboard footer. */
export const THAI_ADAPTED_19_SOURCES =
  "UNECE Active Ageing Index (2019) · ASEAN AAI · สำนักงานสถิติแห่งชาติ (2567)";

/**
 * Dormant reference calculator — mirrors aai-dashboard.html `calc()`: each domain score is the
 * weighted average of its indicators, and the overall AAI is the weighted average of the four
 * domains. NOT used by production scoring; provided so the spec is executable the day this model is
 * wired into the import-questionnaire path.
 *
 * @param values map of indicator id → value (0–100). Missing ids fall back to the 2564 default.
 */
export function scoreThaiAdapted19(
  values: Partial<Record<string, number>> = {},
): { d1: number; d2: number; d3: number; d4: number; overall: number } {
  const domainScores = THAI_ADAPTED_19.map((d) =>
    d.indicators.reduce((sum, i) => sum + (values[i.id] ?? i.default2564) * i.weight, 0),
  );
  const overall = THAI_ADAPTED_19.reduce((sum, d, i) => sum + domainScores[i] * d.weight, 0);
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    d1: r(domainScores[0]), d2: r(domainScores[1]), d3: r(domainScores[2]),
    d4: r(domainScores[3]), overall: r(overall),
  };
}
