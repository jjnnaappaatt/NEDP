/**
 * Friendly display names for the built-in clinical tool codes + project modules. Shared by the results
 * view (PersonToolScores) and the raw export so headers stay identical. Custom survey score codes
 * (SC.*) are NOT here — use the questionnaire's own labels via surveyScoreLabels().
 */
export const TOOL_LABEL: Record<string, string> = {
  AAI: "AAI", EQ5D: "EQ-5D-5L", EQ_VAS: "EQ-VAS", HEARING: "การได้ยิน", VISION: "การมองเห็น",
  FRAIL: "FRAIL", FES_I: "FES-I", BARTHEL: "Barthel", LIADL: "L-IADL", ENVIRONMENT: "สภาพแวดล้อม",
  MINI_COG: "Mini-Cog", TUG: "TUG", STS5: "5×STS", BMD_FRAX: "FRAX", BMD_HEIGHT: "ส่วนสูงที่ลด",
  BMD_B1: "Fracture Risk", BMD_B2: "ระดับแผลกดทับ", ORAL_HEALTH: "สุขภาพช่องปาก", MNA_SF: "MNA-SF",
  TGDS_15: "TGDS-15", D1_WATER: "การดื่มน้ำ", D2_DIET: "ความหลากหลายอาหาร", D3_PORTION: "ปริมาณอาหาร", D4_MEALS: "จำนวนมื้อ",
};

export const MODULE_LABEL: Record<string, string> = {
  general: "ทั่วไป", fall: "หกล้ม", bmd: "กระดูก (BMD)", nutrition: "โภชนาการ", survey: "แบบสอบถาม",
};

/** Canonical display order of questionnaire modules (shared by the per-person list + project dashboard). */
export const MODULE_ORDER = ["general", "fall", "bmd", "nutrition", "survey"];
