import { Badge } from "aai-next-dashboard";

/** A pill that carries its own tone via className (the DS's success/warning/danger token pairs). */
export function Tones() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <Badge className="bg-success-bg text-success-fg">✓ ส่งแล้ว</Badge>
      <Badge className="bg-warning-bg text-warning-fg">⏳ ฉบับร่าง</Badge>
      <Badge className="bg-danger-bg text-danger-fg">✕ ตีกลับ</Badge>
      <Badge className="bg-accent-soft text-ink">★ หัวหน้าโครงการ</Badge>
    </div>
  );
}
