// Shared input styling for the portal forms — matches MonthlyReportForm's numCls.
export const fieldCls =
  "w-full min-h-[44px] rounded-card border border-border bg-surface px-3 text-base text-ink " +
  "placeholder:text-ink-muted outline-none transition focus:border-border-accent focus:ring-2 " +
  "focus:ring-border-accent/30 disabled:opacity-70 disabled:bg-surface-soft";

/** Map a server/RPC error code to a Thai message for the portal forms. */
export function portalErr(code?: string): string {
  if (!code) return "เกิดข้อผิดพลาด กรุณาลองใหม่";
  if (code === "not_contact") return "คุณไม่ได้เป็นผู้รับผิดชอบโครงการนี้";
  if (code === "no_account") return "กรุณาเข้าสู่ระบบผ่าน LINE ก่อน";
  if (/duplicate key|unique/i.test(code)) return "รหัสผู้เข้าร่วมนี้ถูกใช้แล้วในโครงการ";
  return code;
}
