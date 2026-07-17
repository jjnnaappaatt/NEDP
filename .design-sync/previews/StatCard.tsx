import { StatCard } from "aai-next-dashboard";
import { IconUsers, IconChartBar, IconTrendingUp } from "@tabler/icons-react";

/** KPI tiles — a brand-colored IconBadge, a big ink number, a label, and an optional sub-line. */
export function Default() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 200px)", gap: 12 }}>
      <StatCard icon={IconUsers} color="#1a56db" value="306" label="จำนวนผู้สูงอายุ" />
      <StatCard icon={IconChartBar} color="#6d28d9" value="60.6" label="AAI รวม (ล่าสุด)" sub="เริ่มต้น 49.9" />
      <StatCard icon={IconTrendingUp} color="#16a34a" value="102" label="AAI เพิ่มขึ้น ≥ 10%" />
    </div>
  );
}
