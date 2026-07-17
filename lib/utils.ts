import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** First glyph of the first two words — works for Thai + Latin names. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** 'YYYY-MM-DDTHH:mm…' → 'DD ม.ค.' short Thai date for table/feed rows. */
const THAI_ABBR = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export function shortThaiDate(iso?: string): string {
  if (!iso) return "—";
  const [date] = iso.split("T");
  const [, m, d] = date.split("-").map(Number);
  return `${d} ${THAI_ABBR[m]}`;
}
