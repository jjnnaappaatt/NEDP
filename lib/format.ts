/** Client-safe pure helpers (no data/backend imports) — usable from client components. */

/** "Current" month (Gregorian 'YYYY-MM') + today, computed in Asia/Bangkok (UTC+7) so the web
 *  queries the live month — matching the Gregorian year_month the DB bridge writes from the bot's
 *  Thai-Buddhist report_month. */
const _bkk = new Date(Date.now() + 7 * 60 * 60 * 1000);
const _y = _bkk.getUTCFullYear();
const _m = _bkk.getUTCMonth() + 1;
export const CURRENT_MONTH = `${_y}-${String(_m).padStart(2, "0")}`;
export const TODAY = { year: _y, month: _m, day: _bkk.getUTCDate() };

const THAI_MONTHS = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

export function monthLabelThai(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${THAI_MONTHS[m]} ${y + 543}`;
}

export function getCurrentMonth(): string {
  return CURRENT_MONTH;
}

/** The previous Gregorian month ('YYYY-MM') — used to pull last month's values as form hints. */
export function prevMonth(ym: string = CURRENT_MONTH): string {
  const [y, m] = ym.split("-").map(Number);
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  return `${py}-${String(pm).padStart(2, "0")}`;
}
