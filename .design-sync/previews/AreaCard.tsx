import { AreaCard } from "aai-next-dashboard";

type T3 = [number, number, number];
const tri = (v: T3) => ({ base: v[0], prev: v[1], latest: v[2] });
const r = {
  geoCode: "500101", provinceTh: "เชียงใหม่", amphoeTh: "เมืองเชียงใหม่", tambonTh: "ศรีภูมิ",
  nElderly: 28, nUp10: 12, osmBefore: 4, osmAfter: 7,
  overall: tri([53, 59, 65]), d1: tri([46, 51, 56]), d2: tri([52, 57, 62]),
  d3: tri([42, 47, 54]), d4: tri([58, 62, 68]), suppressed: false,
};

/** A per-area drill card: name + head-count, the "ดีขึ้น ≥10%" note, AAI รวม bars, a ดูรายมิติ toggle, and a drill button. */
export function Default() {
  return (
    <div style={{ maxWidth: 360 }}>
      <AreaCard r={r} name="ศรีภูมิ" sub="เมืองเชียงใหม่ · เชียงใหม่" drillLabel="รายบุคคล"
        onDrill={() => {}} compareMode={false} picked={false} onTogglePick={() => {}} pickDisabled={false} />
    </div>
  );
}

/** Compare mode — the same card with a selection checkbox, shown selected (accent ring). */
export function Selected() {
  return (
    <div style={{ maxWidth: 360 }}>
      <AreaCard r={r} name="ศรีภูมิ" sub="เมืองเชียงใหม่ · เชียงใหม่" drillLabel={null}
        onDrill={null} compareMode picked onTogglePick={() => {}} pickDisabled={false} />
    </div>
  );
}
