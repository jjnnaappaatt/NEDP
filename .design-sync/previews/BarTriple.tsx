import { BarTriple } from "aai-next-dashboard";

/** Three-time-point score bars (เริ่มต้น → เดือนที่แล้ว → ล่าสุด) with an automatic Δ badge. 0–100 scale. */
export function Default() {
  return (
    <div style={{ maxWidth: 360 }} className="space-y-3">
      <BarTriple label="AAI รวม" base={48.8} prev={54.1} latest={58.2} />
      <BarTriple label="มิติ 4 สภาพแวดล้อม" base={53.8} prev={59.0} latest={63.2} />
    </div>
  );
}

/** A domain with only a baseline recorded so far — later points read "—" and no change badge shows. */
export function BaselineOnly() {
  return (
    <div style={{ maxWidth: 360 }}>
      <BarTriple label="มิติ 1 การมีงานทำ/รายได้" base={42.8} prev={null} latest={null} />
    </div>
  );
}
