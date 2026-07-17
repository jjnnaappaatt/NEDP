import type { AaiSnapshotRow } from "@/lib/data";

/** Sample AAI rows for the live dashboard components on the guide (ตัวอย่างทั้งหมด — no real data). */
const tri = (base: number, prev: number, latest: number) => ({ base, prev, latest });

function mkRow(
  geoCode: string,
  tambonTh: string,
  nElderly: number,
  nUp10: number,
  ov: [number, number, number],
  d1: [number, number, number],
  d2: [number, number, number],
  d3: [number, number, number],
  d4: [number, number, number],
): AaiSnapshotRow {
  return {
    geoCode,
    provinceTh: "จังหวัดตัวอย่าง",
    amphoeTh: "อำเภอตัวอย่าง",
    tambonTh,
    nElderly,
    nUp10,
    osmBefore: 4,
    osmAfter: 7,
    overall: tri(...ov),
    d1: tri(...d1),
    d2: tri(...d2),
    d3: tri(...d3),
    d4: tri(...d4),
    suppressed: false,
  };
}

export const AREA_ROW = mkRow(
  "500101", "ตำบลตัวอย่าง ก", 28, 12,
  [49.9, 55.2, 60.6], [46, 51, 56], [52, 57, 62], [42, 47, 54], [58, 62, 68],
);

export const COMPARE_ROWS: AaiSnapshotRow[] = [
  AREA_ROW,
  mkRow("500103", "ตำบลตัวอย่าง ข", 22, 9,
    [48.1, 52.6, 57.4], [44, 49, 54], [50, 55, 60], [40, 45, 51], [56, 60, 65]),
  mkRow("500105", "ตำบลตัวอย่าง ค", 31, 15,
    [51.2, 57.0, 62.8], [48, 53, 59], [54, 59, 64], [43, 49, 55], [60, 64, 70]),
];
