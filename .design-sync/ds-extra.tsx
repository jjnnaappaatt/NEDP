// design-sync extra entry — merges the AAI dashboard / data-input building blocks onto window.NEDP.
// The synth entry only scans cfg.srcDir (components/ui); these live outside it, so they're merged here
// via cfg.extraEntries. Keep in sync with the portal/dashboard pins in .design-sync/config.json.
export { StatCard } from "@/components/dashboard/StatCard";
export { BarTriple } from "@/components/portal/BarTriple";
export { SummaryBox } from "@/components/portal/SummaryBox";
export { DimensionHighlightCards } from "@/components/portal/DimensionHighlightCards";
export { DomainScoreInput } from "@/components/portal/DomainScoreInput";
export { AreaCard } from "@/components/portal/AreaCard";
export { AaiComparePanel } from "@/components/portal/AaiComparePanel";
export { ProjectMultiSelect } from "@/components/portal/ProjectMultiSelect";
