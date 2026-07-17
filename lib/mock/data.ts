/**
 * Mock dataset — 10 realistic Thai NEDP "มุ่งเป้าสูงวัย" research projects + 14 accounts, tuned so
 * every screen looks alive: a clean 🥇🥈🥉 podium (70/65/60), a full ranked table, varied สถานะ
 * statuses, a "me" account (a1) at rank ~6 for highlight, and followed accounts on the podium.
 * Phase 2 replaces this behind lib/data with Supabase; nothing imports this file directly except
 * lib/data.
 */
import type {
  Account, AccountFollow, LocationSubmission, LocationVerification, MonthlyRanking, Project,
  ProjectAccountRegistration, ProjectLocation, ProjectTemplate, Submission,
} from "@/types";

export const CURRENT_MONTH = "2026-06";
export const ME_ID = "a1";

export const accounts: Account[] = [
  { id: "a1", name: "ศิริพร ใจดี", org: "มหาวิทยาลัยตัวอย่าง ก", avatarColor: "#1a56db", isMe: true },
  { id: "a2", name: "ธนวัฒน์ ศรีสุข", org: "มหาวิทยาลัยตัวอย่าง ข", avatarColor: "#7c3aed" },
  { id: "a3", name: "กมลชนก พงษ์ไพร", org: "มหาวิทยาลัยตัวอย่าง ค", avatarColor: "#0891b2" },
  { id: "a4", name: "อนุชา วัฒนกูล", org: "มหาวิทยาลัยตัวอย่าง ง", avatarColor: "#16a34a" },
  { id: "a5", name: "ปิยะนุช แก้วมณี", org: "มหาวิทยาลัยตัวอย่าง จ", avatarColor: "#db2777" },
  { id: "a6", name: "วีระศักดิ์ ทองดี", org: "มหาวิทยาลัยตัวอย่าง ฉ", avatarColor: "#ea580c" },
  { id: "a7", name: "ณัฐริกา สมบูรณ์", org: "มหาวิทยาลัยตัวอย่าง ช", avatarColor: "#0d9488" },
  { id: "a8", name: "สุรชัย พัฒนะ", org: "มหาวิทยาลัยตัวอย่าง ซ", avatarColor: "#4f46e5" },
  { id: "a9", name: "พรทิพย์ เจริญผล", org: "มหาวิทยาลัยตัวอย่าง ฌ", avatarColor: "#c026d3" },
  { id: "a10", name: "เอกพงศ์ มั่นคง", org: "มหาวิทยาลัยตัวอย่าง ญ", avatarColor: "#65a30d" },
  { id: "a11", name: "จิราภรณ์ ดวงแก้ว", org: "มหาวิทยาลัยตัวอย่าง ฎ", avatarColor: "#0284c7" },
  { id: "a12", name: "ภาณุพงศ์ รุ่งเรือง", org: "มหาวิทยาลัยตัวอย่าง ฏ", avatarColor: "#9333ea" },
  { id: "a13", name: "อรวรรณ สุขเกษม", org: "มหาวิทยาลัยตัวอย่าง ฐ", avatarColor: "#dc2626" },
  { id: "a14", name: "ชัยวัฒน์ ภูผา", org: "มหาวิทยาลัยตัวอย่าง ฑ", avatarColor: "#0369a1" },
];

export const projects: Project[] = [
  { id: "p1", name: "การส่งเสริมการจ้างงานผู้สูงอายุในชุมชนเมือง", org: "มหาวิทยาลัยตัวอย่าง ก", researcher: "รศ.ดร.ศิริพร ใจดี", deadlineDay: 25, accent: "#1a56db" },
  { id: "p2", name: "นวัตกรรมป้องกันการหกล้มในผู้สูงอายุ", org: "มหาวิทยาลัยตัวอย่าง ง", researcher: "ผศ.ดร.อนุชา วัฒนกูล", deadlineDay: 25, accent: "#16a34a" },
  { id: "p3", name: "ระบบเฝ้าระวังภาวะมวลกระดูกต่ำ (BMD)", org: "มหาวิทยาลัยตัวอย่าง ก", researcher: "ดร.กมลชนก พงษ์ไพร", deadlineDay: 20, accent: "#0891b2" },
  { id: "p4", name: "โภชนาการเชิงรุกสำหรับผู้สูงวัย", org: "มหาวิทยาลัยตัวอย่าง ช", researcher: "ผศ.ณัฐริกา สมบูรณ์", deadlineDay: 25, accent: "#0d9488" },
  { id: "p5", name: "การมีส่วนร่วมทางสังคมของผู้สูงอายุ", org: "มหาวิทยาลัยตัวอย่าง จ", researcher: "รศ.ปิยะนุช แก้วมณี", deadlineDay: 28, accent: "#db2777" },
  { id: "p6", name: "คลังปัญญาผู้สูงอายุและการถ่ายทอดภูมิปัญญา", org: "มหาวิทยาลัยตัวอย่าง ฌ", researcher: "ดร.พรทิพย์ เจริญผล", deadlineDay: 25, accent: "#c026d3" },
  { id: "p7", name: "ที่อยู่อาศัยปลอดภัยสำหรับผู้สูงวัย", org: "มหาวิทยาลัยตัวอย่าง ฎ", researcher: "ผศ.จิราภรณ์ ดวงแก้ว", deadlineDay: 25, accent: "#0284c7" },
  { id: "p8", name: "สุขภาพจิตและการป้องกันภาวะซึมเศร้าในผู้สูงอายุ", org: "มหาวิทยาลัยตัวอย่าง ฉ", researcher: "ดร.วีระศักดิ์ ทองดี", deadlineDay: 20, accent: "#ea580c" },
  { id: "p9", name: "การเข้าถึงบริการสุขภาพปฐมภูมิของผู้สูงอายุ", org: "มหาวิทยาลัยตัวอย่าง ฐ", researcher: "ผศ.ดร.อรวรรณ สุขเกษม", deadlineDay: 25, accent: "#9333ea" },
  { id: "p10", name: "เศรษฐกิจสูงวัยและความมั่นคงทางรายได้", org: "มหาวิทยาลัยตัวอย่าง ซ", researcher: "รศ.ดร.สุรชัย พัฒนะ", deadlineDay: 25, accent: "#4f46e5" },
];

export const registrations: ProjectAccountRegistration[] = [
  { id: "r1", projectId: "p1", accountId: "a1", role: "owner", registeredAt: "2026-01-10" },
  { id: "r2", projectId: "p3", accountId: "a1", role: "submitter", registeredAt: "2026-02-04" },
  { id: "r3", projectId: "p2", accountId: "a4", role: "owner", registeredAt: "2026-01-12" },
  { id: "r4", projectId: "p4", accountId: "a7", role: "owner", registeredAt: "2026-01-15" },
  { id: "r5", projectId: "p6", accountId: "a9", role: "owner", registeredAt: "2026-01-18" },
  { id: "r6", projectId: "p1", accountId: "a2", role: "submitter", registeredAt: "2026-01-20" },
  { id: "r7", projectId: "p7", accountId: "a11", role: "owner", registeredAt: "2026-01-22" },
  { id: "r8", projectId: "p5", accountId: "a5", role: "owner", registeredAt: "2026-01-24" },
  { id: "r9", projectId: "p8", accountId: "a6", role: "owner", registeredAt: "2026-01-25" },
  { id: "r10", projectId: "p10", accountId: "a8", role: "owner", registeredAt: "2026-01-26" },
  { id: "r11", projectId: "p9", accountId: "a13", role: "owner", registeredAt: "2026-01-28" },
  { id: "r12", projectId: "p2", accountId: "a12", role: "submitter", registeredAt: "2026-02-01" },
  { id: "r13", projectId: "p4", accountId: "a14", role: "submitter", registeredAt: "2026-02-02" },
  { id: "r14", projectId: "p5", accountId: "a3", role: "submitter", registeredAt: "2026-02-03" },
];

/** Current-month submissions, tuned for a clean descending point spread (see lib/points). */
export const submissions: Submission[] = [
  // points: 70  early(50)+complete(20)
  s("s1", "p2", "a4", 2, "submitted", 100, 0, "02T09:12"),
  // 65  early+complete −1 edit
  s("s2", "p4", "a7", 2, "submitted", 100, 1, "02T14:40"),
  // 60  ontime(30)+complete(20) +? → use early+complete−2edit
  s("s3", "p6", "a9", 3, "submitted", 100, 2, "03T08:05"),
  // 50  ontime+complete
  s("s4", "p1", "a2", 8, "submitted", 100, 0, "08T10:30"),
  // 50  ontime+complete (tie, later submit)
  s("s5", "p7", "a11", 10, "submitted", 100, 0, "10T16:20"),
  // 45 (ME)  ontime+complete −1 edit
  s("s6", "p3", "a1", 9, "submitted", 100, 1, "09T11:15"),
  // 40  ontime+complete −2 edit
  s("s7", "p5", "a5", 12, "submitted", 100, 2, "12T13:50"),
  // 35  ontime+complete −3 edit
  s("s8", "p9", "a13", 5, "submitted", 100, 3, "05T09:40"),
  // 30  ontime only (incomplete)
  s("s9", "p8", "a6", 14, "submitted", 80, 0, "14T15:10"),
  // 30  ontime only
  s("s10", "p10", "a8", 20, "submitted", 80, 0, "20T12:00"),
  // 25  ontime −1 edit (incomplete)
  s("s11", "p2", "a12", 15, "submitted", 80, 1, "15T18:25"),
  // 10  late
  s("s12", "p4", "a14", 27, "submitted", 70, 0, "27T10:05"),
  // 10  late (project p5 deadline = day 28, so day 29 is late)
  s("s13", "p5", "a3", 29, "submitted", 90, 0, "29T19:30"),
  // "me" second project still a draft (shows ⏳ pending in สถานะ)
  { id: "s14", projectId: "p1", accountId: "a1", yearMonth: CURRENT_MONTH, status: "draft", completionPct: 40, edits: 0 },
];

function s(
  id: string, projectId: string, accountId: string, day: number,
  status: Submission["status"], completionPct: number, edits: number, dt: string,
): Submission {
  return {
    id, projectId, accountId, yearMonth: CURRENT_MONTH, status,
    submittedDay: day, completionPct, edits, submittedAt: `${CURRENT_MONTH}-${dt}:00+07:00`,
  };
}

/** History snapshots (spec §2.2) — top 3 for two prior months. */
export const monthlyRankings: MonthlyRanking[] = [
  { yearMonth: "2026-05", rank: 1, accountId: "a7", projectId: "p4", totalPoints: 70, submittedAt: "2026-05-01T09:00:00+07:00" },
  { yearMonth: "2026-05", rank: 2, accountId: "a1", projectId: "p1", totalPoints: 65, submittedAt: "2026-05-02T10:00:00+07:00" },
  { yearMonth: "2026-05", rank: 3, accountId: "a9", projectId: "p6", totalPoints: 50, submittedAt: "2026-05-03T11:00:00+07:00" },
  { yearMonth: "2026-04", rank: 1, accountId: "a4", projectId: "p2", totalPoints: 70, submittedAt: "2026-04-02T08:30:00+07:00" },
  { yearMonth: "2026-04", rank: 2, accountId: "a11", projectId: "p7", totalPoints: 50, submittedAt: "2026-04-04T09:30:00+07:00" },
  { yearMonth: "2026-04", rank: 3, accountId: "a5", projectId: "p5", totalPoints: 45, submittedAt: "2026-04-05T14:00:00+07:00" },
];

/** "me" follows the three podium leaders + one more (spec §6). */
export const follows: AccountFollow[] = [
  { followerId: "a1", followingId: "a4" },
  { followerId: "a1", followingId: "a7" },
  { followerId: "a1", followingId: "a9" },
  { followerId: "a1", followingId: "a5" },
];

/** Field-deployment areas (พื้นที่ลงพื้นที่) each project reports on; data is entered per location. */
function loc(id: string, projectId: string, province: string, amphoe: string, tambon: string): ProjectLocation {
  return { id, projectId, province, amphoe, tambon };
}
export const locations: ProjectLocation[] = [
  loc("l1a", "p1", "กรุงเทพมหานคร", "บางกะปิ", "คลองจั่น"),
  loc("l1b", "p1", "นนทบุรี", "เมืองนนทบุรี", "บางกระสอ"),
  loc("l1c", "p1", "ปทุมธานี", "คลองหลวง", "คลองหนึ่ง"),
  loc("l2a", "p2", "สงขลา", "หาดใหญ่", "คอหงส์"),
  loc("l2b", "p2", "สงขลา", "เมืองสงขลา", "บ่อยาง"),
  loc("l3a", "p3", "นครปฐม", "เมืองนครปฐม", "สนามจันทร์"),
  loc("l3b", "p3", "สมุทรสาคร", "เมืองสมุทรสาคร", "มหาชัย"),
  loc("l3c", "p3", "ราชบุรี", "เมืองราชบุรี", "หน้าเมือง"),
  loc("l4a", "p4", "พิษณุโลก", "เมืองพิษณุโลก", "ในเมือง"),
  loc("l4b", "p4", "สุโขทัย", "เมืองสุโขทัย", "ธานี"),
  loc("l5a", "p5", "กรุงเทพมหานคร", "ดุสิต", "ดุสิต"),
  loc("l5b", "p5", "กรุงเทพมหานคร", "พระนคร", "ชนะสงคราม"),
  loc("l6a", "p6", "นครศรีธรรมราช", "ท่าศาลา", "ท่าศาลา"),
  loc("l6b", "p6", "นครศรีธรรมราช", "เมืองนครศรีธรรมราช", "คลัง"),
  loc("l7a", "p7", "นครปฐม", "เมืองนครปฐม", "พระปฐมเจดีย์"),
  loc("l7b", "p7", "กาญจนบุรี", "เมืองกาญจนบุรี", "บ้านเหนือ"),
  loc("l8a", "p8", "ชลบุรี", "เมืองชลบุรี", "บางปลาสร้อย"),
  loc("l8b", "p8", "ระยอง", "เมืองระยอง", "ท่าประดู่"),
  loc("l9a", "p9", "พะเยา", "เมืองพะเยา", "เวียง"),
  loc("l9b", "p9", "เชียงราย", "เมืองเชียงราย", "เวียง"),
  loc("l10a", "p10", "กรุงเทพมหานคร", "ห้วยขวาง", "ห้วยขวาง"),
  loc("l10b", "p10", "กรุงเทพมหานคร", "ดินแดง", "ดินแดง"),
];

/** "me" (a1): p3 all locations submitted (done); p1 only 1 of 3 (in progress). */
export const locationSubmissions: LocationSubmission[] = [
  { projectId: "p3", accountId: ME_ID, locationId: "l3a", yearMonth: CURRENT_MONTH, status: "submitted", submittedAt: `${CURRENT_MONTH}-08T10:00:00+07:00` },
  { projectId: "p3", accountId: ME_ID, locationId: "l3b", yearMonth: CURRENT_MONTH, status: "submitted", submittedAt: `${CURRENT_MONTH}-08T11:20:00+07:00` },
  { projectId: "p3", accountId: ME_ID, locationId: "l3c", yearMonth: CURRENT_MONTH, status: "submitted", submittedAt: `${CURRENT_MONTH}-09T09:05:00+07:00` },
  { projectId: "p1", accountId: ME_ID, locationId: "l1a", yearMonth: CURRENT_MONTH, status: "submitted", submittedAt: `${CURRENT_MONTH}-16T14:00:00+07:00` },
];

/** Location-list verification (who/when) — p3 verified, p1 not yet. Editable + re-verifiable. */
export const locationVerifications: LocationVerification[] = [
  { projectId: "p3", verifiedBy: "ศิริพร ใจดี", verifiedAt: `${CURRENT_MONTH}-05T09:30:00+07:00` },
];

/** One shared template (spec §5.2) — sections + typed fields; project name fills the hero. */
export function templateFor(projectId: string): ProjectTemplate {
  return {
    projectId,
    sections: [
      { id: "sec1", title: "ความก้าวหน้าการดำเนินงาน" },
      { id: "sec2", title: "กลุ่มเป้าหมายและพื้นที่" },
      { id: "sec3", title: "ปัญหาและข้อเสนอแนะ" },
    ],
    fields: [
      { id: "f1", sectionId: "sec1", label: "ร้อยละความก้าวหน้า", type: "number", required: true, unit: "%", placeholder: "0–100" },
      { id: "f2", sectionId: "sec1", label: "กิจกรรมที่ดำเนินการเดือนนี้", type: "textarea", required: true, placeholder: "สรุปกิจกรรมหลัก" },
      { id: "f3", sectionId: "sec1", label: "วันที่รายงาน", type: "date", required: true },
      { id: "f4", sectionId: "sec2", label: "จำนวนผู้สูงอายุที่เข้าร่วม", type: "number", required: true, unit: "คน" },
      { id: "f5", sectionId: "sec2", label: "จังหวัดพื้นที่ดำเนินงาน", type: "select", required: true, options: ["เชียงใหม่", "ขอนแก่น", "สงขลา", "กรุงเทพมหานคร", "นครสวรรค์", "อุบลราชธานี"] },
      { id: "f6", sectionId: "sec3", label: "ปัญหา/อุปสรรค", type: "textarea", placeholder: "ระบุหากมี" },
      { id: "f7", sectionId: "sec3", label: "แนบเอกสารประกอบ", type: "file" },
    ],
  };
}
