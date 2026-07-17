/**
 * Single source of truth for the Thai error strings shown by the Excel upload cards. Previously each of
 * the four XlsxCards carried its own copy of this map and they had DRIFTED — `not_contact` rendered as
 * "ต้องลงทะเบียนเป็นผู้ติดต่อก่อน" in two cards and "ต้องเป็นผู้รับผิดชอบโครงการ" in the other two, and
 * `no_match` had two wordings. Centralizing fixes the user-visible inconsistency. See AUDIT.md.
 */
export const ERR_MESSAGES: Record<string, string> = {
  not_contact: "ต้องลงทะเบียนเป็นผู้ติดต่อก่อน",
  not_enabled: "ยังไม่ได้เปิดใช้งานการนำเข้าข้อมูลรายบุคคล",
  no_questionnaire: "โครงการนี้ยังไม่ได้กำหนดแบบสอบถาม",
  missing_columns: "ไฟล์ไม่มีคอลัมน์ จังหวัด/อำเภอ/ตำบล",
  no_match: "ไม่พบพื้นที่ที่ตรงกับรายการของโครงการ",
  no_data: "ยังไม่ได้กรอกค่าในไฟล์",
  empty: "ไฟล์ว่าง",
};

/** Map an error code to its Thai message, falling back to a generic upload-failed string. */
export function errMsg(code?: string, fallback = "อัปโหลดไม่สำเร็จ"): string {
  return (code && ERR_MESSAGES[code]) || fallback;
}
