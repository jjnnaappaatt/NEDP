import { SummaryBox } from "aai-next-dashboard";

/** Compact label + big-value tiles — the person-detail summary row (เริ่มต้น / ล่าสุด / เปลี่ยน). The
 *  highlighted variant tints the accent tile; a null value renders "—". */
export function Default() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, maxWidth: 360 }}>
      <SummaryBox label="เริ่มต้น" value={48.8} />
      <SummaryBox label="ล่าสุด" value={58.2} highlight />
      <SummaryBox label="ยังไม่มี" value={null} />
    </div>
  );
}
