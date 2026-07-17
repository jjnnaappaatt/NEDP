import { Card } from "aai-next-dashboard";

/** Hairline-flat surface (white bg, 1px border, 12px radius, soft shadow) holding project info. */
export function Default() {
  return (
    <Card style={{ maxWidth: 360 }}>
      <div className="font-display text-base font-semibold text-ink">โครงการประเมินความเสี่ยงการหกล้ม</div>
      <p className="mt-1 text-sm text-ink-soft">รอบเดือน มิถุนายน 2569 · 4 พื้นที่</p>
    </Card>
  );
}

/** A compact KPI tile built from the same Card. */
export function Stat() {
  return (
    <Card style={{ maxWidth: 200 }}>
      <div className="text-xs text-ink-muted">คะแนนรวมของฉัน</div>
      <div className="mt-1 font-display text-2xl font-bold text-ink">1,240</div>
    </Card>
  );
}
