import { DomainScoreInput } from "aai-next-dashboard";

/** One labeled 0–100 AAI domain score field — the individual data-entry input. A filled value and an
 *  empty (placeholder) state. */
export function Default() {
  return (
    <div style={{ maxWidth: 360 }} className="space-y-3">
      <DomainScoreInput label="มิติ 1 · การมีงานทำและรายได้" value="52" onChange={() => {}} />
      <DomainScoreInput label="มิติ 2 · การมีส่วนร่วมในสังคม" value="" onChange={() => {}} />
    </div>
  );
}
