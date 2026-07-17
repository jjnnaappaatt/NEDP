/** The four AAI domains (มิติ 1–4) — shared by the dashboard, per-area cards, compare panel, and the
 *  admin by-province panel, so the labels stay identical everywhere. */
export const DOMAINS: { key: "d1" | "d2" | "d3" | "d4"; label: string }[] = [
  { key: "d1", label: "มิติ 1 การมีงานทำ/รายได้" },
  { key: "d2", label: "มิติ 2 การมีส่วนร่วม" },
  { key: "d3", label: "มิติ 3 สุขภาพ/ความมั่นคง" },
  { key: "d4", label: "มิติ 4 สภาพแวดล้อม" },
];
