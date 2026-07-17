import { Button } from "aai-next-dashboard";

const row: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" };

/** The four variants: black-pill primary, mint accent, hairline secondary, ghost. */
export function Variants() {
  return (
    <div style={row}>
      <Button>บันทึกข้อมูล</Button>
      <Button variant="accent">ส่งรายงาน</Button>
      <Button variant="secondary">ยกเลิก</Button>
      <Button variant="ghost">ดูเพิ่มเติม</Button>
    </div>
  );
}

/** Disabled + accent call-to-action. */
export function States() {
  return (
    <div style={row}>
      <Button>ยืนยัน</Button>
      <Button disabled>กำลังบันทึก…</Button>
      <Button variant="accent">＋ เพิ่มพื้นที่</Button>
    </div>
  );
}
