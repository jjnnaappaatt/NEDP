/**
 * Risk-level display vocabulary shared by the per-person tool list (PersonToolScores) and the aggregate
 * project survey dashboard (SurveyDashboard / DistributionBar) so labels + colors stay identical.
 */
export const RISK_LABEL: Record<string, string> = { normal: "ต่ำ/ปกติ", medium: "ปานกลาง", high: "สูง" };

/** Soft chip classes (pastel bg + readable fg) for a single risk badge. */
export const riskChip = (level: string) =>
  level === "high" ? "bg-danger/10 text-danger-fg"
    : level === "medium" ? "bg-warning-bg text-warning-fg"
      : "bg-success-bg text-success-fg";

/** Solid segment color for a risk band in a stacked distribution bar. */
export const riskSolid = (level: "high" | "medium" | "normal") =>
  level === "high" ? "bg-danger" : level === "medium" ? "bg-warning" : "bg-success";
