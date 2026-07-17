/** Approximate centroid (provincial-seat) coordinates [lat, lng] for all 77 Thai provinces, keyed by the Thai
 *  names the app uses. NB: the visit picker's names come from monitor_project_areas and are ABBREVIATED
 *  (กรุงเทพ, อยุธยา) — those spellings are the primary keys; canonical variants are added as aliases. Used to
 *  auto-select the nearest จังหวัดเป้าหมาย for a chosen จังหวัดเจ้าภาพ (haversine ranking; accuracy to a few km is
 *  plenty for "which provinces are nearby"). */
export const PROVINCE_CENTROIDS: Record<string, [number, number]> = {
  // Central
  กรุงเทพ: [13.75, 100.52], กรุงเทพมหานคร: [13.75, 100.52],
  นนทบุรี: [13.86, 100.51], ปทุมธานี: [14.02, 100.53],
  อยุธยา: [14.35, 100.58], พระนครศรีอยุธยา: [14.35, 100.58],
  สมุทรปราการ: [13.6, 100.6], สมุทรสาคร: [13.55, 100.27], สมุทรสงคราม: [13.41, 100.0],
  นครปฐม: [13.82, 100.06], นครนายก: [14.2, 101.21], สระบุรี: [14.53, 100.91], ลพบุรี: [14.8, 100.65],
  สิงห์บุรี: [14.89, 100.4], อ่างทอง: [14.59, 100.45], ชัยนาท: [15.19, 100.13], อุทัยธานี: [15.38, 100.02],
  สุพรรณบุรี: [14.47, 100.12], กาญจนบุรี: [14.02, 99.53], ราชบุรี: [13.54, 99.81], เพชรบุรี: [13.11, 99.94],
  ประจวบคีรีขันธ์: [11.81, 99.8],
  // East
  ชลบุรี: [13.36, 100.98], ระยอง: [12.68, 101.28], จันทบุรี: [12.61, 102.1], ตราด: [12.24, 102.51],
  ฉะเชิงเทรา: [13.69, 101.07], ปราจีนบุรี: [14.05, 101.37], สระแก้ว: [13.82, 102.07],
  // North
  เชียงใหม่: [18.79, 98.98], เชียงราย: [19.91, 99.83], ลำพูน: [18.58, 99.01], ลำปาง: [18.29, 99.49],
  แม่ฮ่องสอน: [19.3, 97.97], น่าน: [18.78, 100.77], พะเยา: [19.17, 99.9], แพร่: [18.14, 100.14],
  อุตรดิตถ์: [17.62, 100.1], ตาก: [16.87, 99.13], สุโขทัย: [17.01, 99.82], พิษณุโลก: [16.82, 100.27],
  พิจิตร: [16.44, 100.35], กำแพงเพชร: [16.48, 99.52], เพชรบูรณ์: [16.42, 101.16], นครสวรรค์: [15.7, 100.14],
  // Northeast (Isan)
  นครราชสีมา: [14.97, 102.1], บุรีรัมย์: [14.99, 103.1], สุรินทร์: [14.88, 103.49], ศรีสะเกษ: [15.12, 104.32],
  อุบลราชธานี: [15.24, 104.85], ยโสธร: [15.79, 104.14], ชัยภูมิ: [15.81, 102.03], อำนาจเจริญ: [15.86, 104.63],
  หนองบัวลำภู: [17.2, 102.44], ขอนแก่น: [16.44, 102.83], อุดรธานี: [17.41, 102.79], เลย: [17.49, 101.73],
  หนองคาย: [17.88, 102.74], มหาสารคาม: [16.18, 103.3], ร้อยเอ็ด: [16.05, 103.65], กาฬสินธุ์: [16.43, 103.51],
  สกลนคร: [17.16, 104.15], นครพนม: [17.41, 104.78], มุกดาหาร: [16.54, 104.72], บึงกาฬ: [18.36, 103.65],
  // South
  นครศรีธรรมราช: [8.43, 99.96], กระบี่: [8.09, 98.91], พังงา: [8.45, 98.53], ภูเก็ต: [7.88, 98.39],
  สุราษฎร์ธานี: [9.14, 99.33], ระนอง: [9.96, 98.64], ชุมพร: [10.49, 99.18], สงขลา: [7.19, 100.6],
  สตูล: [6.62, 100.07], ตรัง: [7.56, 99.61], พัทลุง: [7.62, 100.08], ปัตตานี: [6.87, 101.25],
  ยะลา: [6.54, 101.28], นราธิวาส: [6.43, 101.82],
};

/** Great-circle distance in km between two [lat, lng] points. */
export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const distFrom = (host: string) => {
  const h = PROVINCE_CENTROIDS[host];
  return (p: string): number => {
    const c = PROVINCE_CENTROIDS[p];
    return h && c ? haversineKm(h, c) : Infinity;
  };
};

/** The `n` candidate provinces nearest to `host` (excludes the host; provinces with no known centroid are skipped). */
export function nearestProvinces(host: string, candidates: string[], n: number): string[] {
  if (!PROVINCE_CENTROIDS[host]) return [];
  const d = distFrom(host);
  return candidates
    .filter((p) => p !== host && PROVINCE_CENTROIDS[p])
    .sort((a, b) => d(a) - d(b))
    .slice(0, n);
}

/** `candidates` ordered nearest→farthest from `host` (unknown host → unchanged; unknown provinces sort last). */
export function sortByDistanceFrom(host: string, candidates: string[]): string[] {
  if (!host || !PROVINCE_CENTROIDS[host]) return candidates;
  const d = distFrom(host);
  return [...candidates].sort((a, b) => d(a) - d(b));
}
