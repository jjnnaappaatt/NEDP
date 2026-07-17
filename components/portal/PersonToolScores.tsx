import { cn } from "@/lib/utils";
import { IconAlertTriangle } from "@tabler/icons-react";
import { TOOL_LABEL, MODULE_LABEL, MODULE_ORDER } from "@/lib/questionnaire/toolLabels";
import { RISK_LABEL, riskChip } from "./riskStyles";

export interface ToolScoreView {
  toolCode: string; projectModule: string; scoreLabel: string; riskLevel: string; flag: boolean;
}

/** Per-tool clinical scores grouped by module, with risk badges + referral (in scoreLabel) + optional
 *  per-project risk summary. Used in the form result and the person detail view. */
export function PersonToolScores({ scores, riskSummary, title = "คะแนนเครื่องมือคลินิก", labelOverrides }: {
  scores: ToolScoreView[]; riskSummary?: Record<string, string>; title?: string;
  /** Friendly names for custom score codes (e.g. survey declared-score keys not in TOOL_LABEL). */
  labelOverrides?: Record<string, string>;
}) {
  if (!scores.length) return null;
  const nameFor = (code: string) => TOOL_LABEL[code] ?? labelOverrides?.[code] ?? code;
  const modules = [...new Set(scores.map((s) => s.projectModule))].sort((a, b) => MODULE_ORDER.indexOf(a) - MODULE_ORDER.indexOf(b));
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-ink">{title}</div>
      {modules.map((mod) => {
        const rows = scores.filter((s) => s.projectModule === mod);
        const summary = riskSummary?.[mod];
        return (
          <div key={mod} className="rounded-card border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-xs font-medium text-ink-soft">
              <span>{MODULE_LABEL[mod] ?? mod}</span>
              {summary && <span className={cn("rounded-full px-2 py-0.5", riskChip(summary))}>ความเสี่ยงรวม: {RISK_LABEL[summary] ?? summary}</span>}
            </div>
            <div className="divide-y divide-border/60">
              {rows.map((s) => (
                <div key={s.toolCode} className="flex items-start justify-between gap-2 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-ink">{nameFor(s.toolCode)}</span>
                    <span className="ml-2 text-ink-soft">{s.scoreLabel}</span>
                  </div>
                  <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", riskChip(s.riskLevel))}>
                    {s.flag && <IconAlertTriangle size={12} />}
                    {RISK_LABEL[s.riskLevel] ?? s.riskLevel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
