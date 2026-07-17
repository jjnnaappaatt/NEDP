import { AaiComparePanel } from "aai-next-dashboard";

type T3 = [number, number, number];
const tri = (v: T3) => ({ base: v[0], prev: v[1], latest: v[2] });
const row = (
  geoCode: string, tambonTh: string, nElderly: number, nUp10: number,
  ov: T3, d1: T3, d2: T3, d3: T3, d4: T3,
) => ({
  geoCode, provinceTh: "เชียงใหม่", amphoeTh: "เมืองเชียงใหม่", tambonTh,
  nElderly, nUp10, osmBefore: 4, osmAfter: 7,
  overall: tri(ov), d1: tri(d1), d2: tri(d2), d3: tri(d3), d4: tri(d4), suppressed: false,
});
const rows = [
  row("500101", "ศรีภูมิ", 28, 12, [53, 59, 65], [46, 51, 56], [52, 57, 62], [42, 47, 54], [58, 62, 68]),
  row("500103", "ช้างเผือก", 22, 9, [51, 56, 62], [44, 49, 54], [50, 55, 60], [40, 45, 51], [56, 60, 65]),
];

/** Side-by-side comparison of up to 5 areas — เริ่มต้น→ล่าสุด per domain, each with a remove ✕ and a clear-all. */
export function Default() {
  return (
    <div style={{ maxWidth: 760 }}>
      <AaiComparePanel rows={rows} nameOf={(r: { tambonTh: string }) => r.tambonTh}
        onRemove={() => {}} onClear={() => {}} />
    </div>
  );
}
