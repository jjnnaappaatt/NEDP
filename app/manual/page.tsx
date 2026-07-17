"use client";

import { Fragment, useState, type CSSProperties } from "react";
import {
  IconUsers, IconChartBar, IconTrendingUp, IconHeartHandshake,
  IconBell, IconClock, IconChecklist, IconPlus, IconCircleCheck,
  IconArrowRight, IconChevronRight, IconInfoCircle,
  IconId, IconFileSpreadsheet, IconFileText, IconDownload, IconShieldLock,
  IconLifebuoy, IconBug, IconMapPinCheck, IconUsersGroup, IconTrash,
  IconBrandLine, IconEdit, IconSearch, IconLogout, IconSend, IconFolders,
  IconUserShield, IconChartPie, IconShieldCheck, IconClipboardCheck, IconClipboardText,
  IconSettings, IconLayoutDashboard, IconTrophy, IconCalendarEvent, IconAddressBook,
} from "@tabler/icons-react";
import { Reveal, CountUp } from "@/components/manual/motion";
import { PhoneFrame } from "@/components/manual/PhoneFrame";
import { InteractivePhone } from "@/components/manual/InteractivePhone";
import { ThemeToggle } from "@/components/manual/ThemeToggle";
import { Hero3DMount } from "@/components/manual/Hero3DMount";
import { StickyPhone } from "@/components/manual/StickyPhone";
import { ShareManual } from "@/components/manual/ShareManual";
import { AaiDashboardFrame } from "@/components/manual/AaiDashboardFrame";
import { SummaryBox } from "@/components/portal/SummaryBox";
import { BarTriple } from "@/components/portal/BarTriple";
import { DimensionHighlightCards } from "@/components/portal/DimensionHighlightCards";
import { AreaCard } from "@/components/portal/AreaCard";
import { AaiComparePanel } from "@/components/portal/AaiComparePanel";
import { StatusBadge } from "@/components/ui/Badge";
import { AREA_ROW, COMPARE_ROWS } from "./data";

const NAV = [
  { href: "#roles", label: "บทบาท" },
  { href: "#line", label: "เริ่มต้น" },
  { href: "#submit", label: "ส่งข้อมูล" },
  { href: "#questionnaire", label: "แบบสอบถาม" },
  { href: "#area", label: "แดชบอร์ด" },
  { href: "#reports", label: "รายงาน" },
  { href: "#admin", label: "ผู้ดูแล" },
  { href: "#part2", label: "AAI Index" },
  { href: "#contact", label: "ติดต่อ" },
];

// ── บทบาทผู้ใช้ 4 กลุ่ม (#roles) ─────────────────────────────────────────────
const ROLES = [
  { icon: IconUsersGroup, name: "เจ้าหน้าที่ภาคสนาม", en: "Field Officer",
    who: "ผู้ที่ลงทะเบียนกับโครงการและมีเบอร์โทรในระบบ",
    can: ["บันทึกและส่งผลประเมินรายบุคคลในแต่ละรอบเดือน", "ทำแบบประเมินผู้สูงอายุรายบุคคล", "จัดการรายชื่อพื้นที่ของโครงการตนเอง"] },
  { icon: IconUserShield, name: "หัวหน้าโครงการ", en: "Project Head",
    who: "มีได้หนึ่งคนต่อโครงการ (ผู้ดูแลระบบอนุมัติให้เป็น)",
    can: ["ทำได้ทุกอย่างเหมือนเจ้าหน้าที่", "เห็นการส่งข้อมูลของสมาชิกทุกคน", "อนุมัติแบบสอบถามของทีม"] },
  { icon: IconChartPie, name: "ผู้บริหาร", en: "Executive",
    who: "ผู้ดูภาพรวมระดับประเทศ จังหวัด และตำบล",
    can: ["ดูแดชบอร์ด AAI ภาพรวม", "เห็นเฉพาะข้อมูลสรุป ไม่เห็นรายบุคคล"] },
  { icon: IconShieldCheck, name: "ผู้ดูแลระบบ", en: "Admin",
    who: "เข้าด้วยรหัสผ่านกลาง แยกจากบัญชี LINE",
    can: ["จัดการโครงการ ผู้ใช้ และคำขอทั้งหมด", "ส่งการแจ้งเตือนและตั้งค่าระบบ"] },
];

// ── /integrate (#integrate) — เปิดใช้ข้อมูลรายบุคคล + แบบสอบถามเฉพาะโครงการ ────
const INTEGRATE_GATES = [
  { n: 1, icon: IconClipboardCheck, t: "ขอเปิดใช้การประเมินรายบุคคล",
    d: "หัวหน้าโครงการกดขอเปิดใช้ → ผู้ดูแลระบบอนุมัติ จากนั้นโครงการจึงเริ่มเก็บข้อมูลรายบุคคลได้" },
  { n: 2, icon: IconClipboardText, t: "เลือกหรือออกแบบแบบสอบถาม",
    d: "ใช้แบบสอบถามมาตรฐาน NEDP ได้ทันที หรือออกแบบเองแล้วส่งเป็นไฟล์ JSON (ไฟล์ข้อมูลตามรูปแบบที่ระบบกำหนด) → หัวหน้าโครงการหรือผู้ดูแลอนุมัติก่อนใช้จริง" },
  { n: 3, icon: IconSettings, t: "ระบบสร้างให้อัตโนมัติ",
    d: "เมื่ออนุมัติแล้ว ระบบสร้างฟอร์มในแอป ไฟล์ Excel ต้นแบบ และคู่มือให้เอง พร้อมคำนวณคะแนน AAI อัตโนมัติ" },
];

// ตัวอย่างไฟล์ JSON (โชว์ในหัวข้อ "นำเข้าแบบสอบถาม") — อิงหน้าจริงในแอป
const QJSON_SAMPLE = `{
  "title": "แบบสอบถามความพึงพอใจโครงการ",
  "questions": [
    { "id": 1, "text": "พึงพอใจกิจกรรมเพียงใด", "type": "scale_5" },
    { "id": 2, "text": "เคยเข้าร่วมมาก่อนหรือไม่", "type": "radio",
      "options": [ {"value":1,"label":"เคย"}, {"value":0,"label":"ไม่เคย"} ] },
    { "id": 3, "text": "จำนวนครั้งที่เข้าร่วม", "type": "number", "min": 0 },
    { "id": 4, "text": "กิจกรรมที่สนใจ", "type": "checkbox_multi",
      "options": [ {"value":"a","label":"ออกกำลังกาย"},
                   {"value":"b","label":"เข้าสังคม"} ] }
  ],
  "scores": [
    { "key": "sat", "label": "คะแนนพึงพอใจ", "questions": [1], "agg": "mean" }
  ]
}`;

// ── คอนโซลผู้ดูแลระบบ (#admin) — 9 หน้า ──────────────────────────────────────
const ADMIN_PAGES = [
  { icon: IconLayoutDashboard, t: "แดชบอร์ด AAI", d: "ภาพรวมผล AAI ของทุกโครงการ ไล่ดูรายจังหวัด / อำเภอ / ตำบล" },
  { icon: IconChecklist, t: "สถานะ & แจ้งเตือน", d: "ดูความคืบหน้าการส่งของทุกโครงการ กดส่งเตือนผ่าน LINE ดูตัวอย่าง/ประวัติการเตือน และส่งออก Excel" },
  { icon: IconTrophy, t: "อันดับ", d: "ตารางอันดับการส่งข้อมูลของทุกโครงการ" },
  { icon: IconCalendarEvent, t: "นัดลงพื้นที่", d: "สร้างคำเชิญลงพื้นที่ ส่งเข้าจังหวัดเป้าหมาย และดูผู้ตอบรับ" },
  { icon: IconFolders, t: "โครงการ", d: "เพิ่ม / แก้ / ลบโครงการ ตั้งหัวหน้าและรูป มอบแบบสอบถาม และอนุมัติคำขอ 3 แบบ" },
  { icon: IconClipboardText, t: "แบบสอบถาม", d: "นำเข้าแบบสอบถาม (ไฟล์ JSON) แล้วระบบสร้างฟอร์ม ไฟล์ Excel และคู่มือให้อัตโนมัติ" },
  { icon: IconAddressBook, t: "ทะเบียนผู้ใช้", d: "รายชื่อผู้ลงทะเบียนรับแจ้งเตือน แยกตามโครงการ" },
  { icon: IconBug, t: "แจ้งปัญหา", d: "คิวคำขอแก้ไขข้อมูลและปัญหาที่ผู้ใช้แจ้ง กด “แก้แล้ว” ระบบแจ้งกลับให้อัตโนมัติ" },
  { icon: IconSettings, t: "ตั้งค่า", d: "ตั้งค่าการเตือนอัตโนมัติ — เปิด/ปิด วันครบกำหนด เตือนล่วงหน้ากี่วัน ความถี่ และเวลาส่ง" },
];

const SUBMIT_STEPS = [
  {
    src: "/manual/submit-picker.png", alt: "เปิดโครงการที่รับผิดชอบ",
    caption: "เปิดโครงการที่รับผิดชอบ",
    detail: "แตะ “ส่งข้อมูล” จากแถบเมนูล่าง ระบบจะพาเข้าโครงการของคุณโดยอัตโนมัติ พร้อมสรุปรอบเดือน จำนวนพื้นที่ และเวลาที่เหลือก่อนถึงกำหนดส่ง แสดงไว้ด้านบนของหน้าจอ",
  },
  {
    src: "/manual/submit-locations.png", alt: "ไล่โฟลเดอร์พื้นที่จนถึงตำบล",
    caption: "ไล่โฟลเดอร์พื้นที่จนถึงตำบล",
    detail: "แตะโฟลเดอร์ไล่ระดับ จังหวัด → อำเภอ → ตำบล ทุกโฟลเดอร์บอกความคืบหน้าของตัวเอง เช่น “3/4 ครบ” พร้อมป้ายสี ครบ / ไม่ครบ / ยังไม่เริ่ม — เห็นทันทีว่าเหลืองานที่ไหน",
  },
  {
    src: "/manual/submit-form.png", alt: "เปิดรายชื่อผู้สูงอายุ แล้วให้คะแนน AAI",
    caption: "เลือกผู้สูงอายุ แล้วให้คะแนน AAI 4 มิติ",
    detail: "ที่ระดับตำบล แตะรายชื่อเพื่อเปิดหน้าให้คะแนน กรอกมิติละ 0–100 ระบบคำนวณคะแนนรวมให้ทันที พร้อมเทียบกับคะแนนตั้งต้นและรอบก่อนหน้าของคนคนเดียวกัน",
  },
];

const FOLDER_PATH = ["โครงการ", "จังหวัด", "อำเภอ", "ตำบล", "รายบุคคล"];

const HUB_TABS = [
  { t: "รายชื่อ / ค้นหา", d: "ดูรายชื่อผู้สูงอายุทั้งหมดที่บันทึกไว้ในตำบลนี้ พร้อมคะแนนล่าสุดของแต่ละคน ค้นหาด้วยชื่อได้ทันที" },
  { t: "เพิ่มผู้สูงอายุ", d: "ลงทะเบียนคนใหม่พร้อมข้อมูลพื้นฐาน (เพศ · ช่วงอายุ · การศึกษา · อาชีพ) ระบบออกรหัสประจำตัวให้อัตโนมัติ — ลงทะเบียนครั้งเดียว ใช้ประเมินซ้ำได้ทุกรอบเดือน" },
  { t: "อสม.", d: "บันทึกจำนวน อสม. ที่ดูแลพื้นที่ อัปเดตได้ทุกเดือนเพื่อให้แดชบอร์ดสะท้อนกำลังคนจริง" },
];

const DOMAINS = [
  { k: "D1", w: 30, label: "การมีงานทำ", d: "การทำงานและรายได้ของผู้สูงอายุช่วงวัย 55–74 ปี" },
  { k: "D2", w: 15, label: "การมีส่วนร่วม", d: "การเข้าร่วมกลุ่ม/ชมรม การดูแลครอบครัว และกิจกรรมชุมชน" },
  { k: "D3", w: 30, label: "สุขภาพดีและความมั่นคง", d: "สุขภาพกาย–ใจ การเข้าถึงบริการ กิจวัตรประจำวัน รายได้ และที่อยู่อาศัย" },
  { k: "D4", w: 25, label: "ศักยภาพและสภาพแวดล้อม", d: "อายุคาดเฉลี่ย สุขภาพจิต เครือข่ายทางสังคม การใช้อินเทอร์เน็ต และการศึกษา" },
];

const KPIS = [
  { icon: IconUsers, tint: "var(--mn-blue)", num: 306, dec: 0, label: "จำนวนผู้สูงอายุ" },
  { icon: IconChartBar, tint: "var(--mn-violet)", num: 60.6, dec: 1, label: "AAI รวม (ล่าสุด) · เริ่มต้น 49.9" },
  { icon: IconTrendingUp, tint: "var(--success-fg)", num: 102, dec: 0, label: "AAI เพิ่มขึ้นตั้งแต่ 10% ขึ้นไป" },
  { icon: IconHeartHandshake, tint: "var(--text-accent)", num: 48, dec: 0, label: "อสม." },
];

const BELL = [
  { icon: IconClock, tint: "warning", title: "ใกล้กำหนดส่ง", sub: "โครงการตัวอย่าง A · เหลือ 3 วัน" },
  { icon: IconChecklist, tint: "muted", title: "งานค้าง", sub: "ตำบลตัวอย่าง ข ยังไม่ส่ง" },
  { icon: IconPlus, tint: "blue", title: "คำขออนุมัติ", sub: "ขอแก้ไขข้อมูล ตำบลตัวอย่าง ก" },
  { icon: IconCircleCheck, tint: "success", title: "ปัญหาที่แก้แล้ว", sub: "การซิงก์ข้อมูลเรียบร้อย" },
];

// AAI-Index framework (Thai Adapted Version, 2567): 4 domains · Overall AAI · weights 30/15/30/25.
// The live SQL scorer applies these weights over a standardized indicator set that is never surfaced
// per-person. The #part2 calculator is a standalone educational reference (UNECE-adapted), NOT the
// app's engine — there is no per-person 22→19 migration.
const PART2 = [
  { k: "D1 · การมีงานทำ", w: "30%", d: "การมีงานทำช่วงอายุ 55–74 ปี" },
  { k: "D2 · การมีส่วนร่วม", w: "15%", d: "กลุ่ม/ชมรม · ดูแลครอบครัว · กิจกรรมชุมชน" },
  { k: "D3 · สุขภาพดีและความมั่นคง", w: "30%", d: "ออกกำลังกาย · บริการสุขภาพ · กิจวัตร (ADLs) · รายได้/ความมั่นคง · ที่อยู่อาศัย" },
  { k: "D4 · ศักยภาพและสภาพแวดล้อม", w: "25%", d: "อายุคาดเฉลี่ย · ปีสุขภาพดี · สุขภาพจิต · เครือข่าย · อินเทอร์เน็ต · การศึกษา" },
];

// ── ลงทะเบียน & โปรไฟล์ (#account) ───────────────────────────────────────────
const ACCOUNT_STEPS = [
  { icon: IconId, t: "กรอกข้อมูลติดต่อก่อน", d: "ก่อนกรอกหรือแก้ไขข้อมูลใด ๆ ระบบขอ ชื่อจริง–นามสกุล และเบอร์โทรของคุณครั้งเดียว เพื่อยืนยันตัวผู้รับผิดชอบ" },
  { icon: IconSearch, t: "ค้นหาและลงทะเบียนโครงการ", d: "ค้นด้วยชื่อโครงการ ผู้วิจัย หรือองค์กร แล้วกดลงทะเบียนเข้าร่วม — เห็นเฉพาะโครงการที่คุณรับผิดชอบบนหน้าหลัก" },
  { icon: IconBrandLine, t: "เชื่อมบัญชี LINE", d: "เชื่อม LINE เพื่อดึงรูปโปรไฟล์และรับการแจ้งเตือนถึงมือถือ · แก้ไขโปรไฟล์ (ชื่อ เบอร์ หน่วยงาน อีเมล) และดูประวัติกิจกรรมของตัวเองได้ทุกเมื่อ" },
];

// ── รายงานและส่งออกข้อมูล (#reports) ─────────────────────────────────────────
const REPORTS = [
  { icon: IconFileSpreadsheet, tint: "var(--mn-green)", t: "ส่งออกข้อมูลดิบ (Excel)", d: "เลือกโครงการและเดือน (หรือทั้งหมด) ได้ไฟล์ .xlsx หลายชีต — รายบุคคล AAI · อสม. · รายพื้นที่ · รายชื่อผู้เข้าร่วม โดยใช้ รหัสประจำตัว ไม่ใช่ชื่อจริง" },
  { icon: IconFileText, tint: "var(--mn-blue)", t: "รายงานฉบับเต็ม PDF / Word", d: "ดาวน์โหลดรายงานสรุปของแต่ละโครงการเป็น PDF หรือ Word พร้อมพิมพ์หรือส่งต่อ" },
  { icon: IconChartBar, tint: "var(--mn-violet)", t: "การ์ดสรุปตัวเลขสำคัญ + สรุปรายโครงการ", d: "ดูภาพรวมของฉันในหน้าเดียว — โครงการ ส่งครบ ส่งตรงเวลา คะแนนรวม และสถานะรายโครงการ" },
];

// ── ช่วยเหลือ & แจ้งปัญหา (#help) ────────────────────────────────────────────
const HELP_CARDS = [
  { icon: IconLifebuoy, t: "ศูนย์ช่วยเหลือ", d: "รวมคู่มือการใช้งาน คำถามพบบ่อย และช่องทางติดต่อทีมงานไว้ในที่เดียว" },
  { icon: IconBug, t: "แจ้งปัญหา", d: "เลือกประเภทปัญหา อธิบายสั้น ๆ แนบภาพหน้าจอได้ ระบบออกเลขติดตาม NEDP-#### ให้ทันที และแจ้งกลับเมื่อแก้ไขเรียบร้อย" },
];

// ── ฟังก์ชันทั้งหมด (feature index) ──────────────────────────────────────────
const FEATURE_INDEX: { group: string; icon: typeof IconFolders; items: string[] }[] = [
  { group: "หน้าหลัก", icon: IconFolders, items: ["ทักทายด้วยชื่อ + การ์ดสรุป 4 ตัว", "รายการโครงการของฉัน พร้อมปุ่มลัด", "ค้นหาโครงการทั่วระบบจากแถบบน"] },
  { group: "ส่งข้อมูล", icon: IconSend, items: ["ไล่โฟลเดอร์ จังหวัด→อำเภอ→ตำบล→บุคคล", "เพิ่มผู้สูงอายุ (ยินยอม PDPA · ออกรหัสอัตโนมัติ)", "ให้คะแนน AAI 4 มิติ · ค้นหาด้วยชื่อ", "บันทึกจำนวน อสม. · flag “ส่งต่อ” · ใช้ค่าเดือนก่อน", "ลบข้อมูลบุคคลถาวร (ยืนยันก่อน)"] },
  { group: "สถานะ / จัดการ", icon: IconMapPinCheck, items: ["ความคืบหน้า ส่งแล้ว x/y พื้นที่", "จัดการ + ยืนยันรายชื่อพื้นที่", "ขอแก้ไข → รออนุมัติ", "กิจกรรมทีม (สำหรับหัวหน้าโครงการ)", "ออกจากโครงการ"] },
  { group: "อันดับ", icon: IconTrendingUp, items: ["โพเดียม 3 อันดับแรก + เหรียญ", "อันดับเดือนนี้ / ย้อนหลัง / ส่งเร็วที่สุด", "ไฮไลต์แถวของคุณ"] },
  { group: "แดชบอร์ด AAI รายพื้นที่", icon: IconChartBar, items: ["ไล่ดู จังหวัด→ตำบล→รายบุคคล", "เปรียบเทียบสูงสุด 5 พื้นที่", "ปิดข้อมูลกลุ่มเล็ก (k-anonymity)", "โหมดตัวอย่าง (Demo)"] },
  { group: "รายงาน", icon: IconFileSpreadsheet, items: ["ส่งออก Excel รายเดือน/ทั้งหมด", "รายงานฉบับเต็ม PDF / Word", "การ์ดสรุปตัวเลขสำคัญ + สรุปรายโครงการ"] },
  { group: "แจ้งเตือน", icon: IconBell, items: ["กระดิ่งในแอป (งานค้าง · คำขออนุมัติ)", "ข้อความจากบอทใน LINE", "หยุดเตือนอัตโนมัติเมื่อส่งครบ"] },
  { group: "LINE บอท", icon: IconBrandLine, items: ["เมนูลัดเปิดแอปในแชท", "คำเชิญลงพื้นที่ + กดตอบรับ / ปฏิเสธได้", "สมัครรับแจ้งเตือนแบบแตะเดียว"] },
];

const CHECKLIST = [
  "เปิดแอปจากเมนู LINE — ไม่มีหน้าล็อกอิน",
  "ลงทะเบียนโครงการ + กรอกข้อมูลติดต่อครั้งเดียว",
  "บันทึกคะแนน AAI รายบุคคล ครบ 4 มิติ",
  "ติดตามสถานะ อันดับ และการแจ้งเตือนสองช่องทาง",
  "ดูแดชบอร์ด AAI รายพื้นที่ และส่งออกรายงาน (Excel/PDF/Word)",
];

const BELL_TINT: Record<string, string> = {
  warning: "background:var(--warning-bg);color:var(--warning-fg)",
  muted: "background:var(--surface-2);color:var(--text-secondary)",
  blue: "background:color-mix(in srgb,var(--mn-blue) 12%,transparent);color:var(--mn-blue)",
  success: "background:var(--success-bg);color:var(--success-fg)",
};
const style = (s: string) =>
  Object.fromEntries(s.split(";").filter(Boolean).map((p) => {
    const [k, v] = p.split(":");
    return [k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v.trim()];
  })) as CSSProperties;

export default function ManualPage() {
  const [cmp, setCmp] = useState(COMPARE_ROWS);

  return (
    <div className="mn-root">
      {/* ── NAV ── */}
      <nav className="mn-nav">
        <div className="mn-nav-inner">
          <a href="#hero" className="mn-nav-brand">
            <span className="mn-brand-n">N</span>
            <span className="mn-brand-name">
              <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>NEDP</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap" }}>คู่มือการใช้งาน</span>
            </span>
          </a>
          <div className="mn-nav-links mn-scroll">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="mn-nav-link">{n.label}</a>
            ))}
          </div>
          <ThemeToggle />
        </div>
      </nav>

      {/* ── 1 · HERO ── */}
      <section id="hero" className="mn-section" style={{ paddingBottom: "clamp(56px,7vw,96px)" }}>
        <div className="mn-hero">
          <div className="mn-hero-copy">
            <span className="mn-eyebrow"><span className="mn-eyebrow-dot" />คู่มือการใช้งาน · สำหรับเจ้าหน้าที่ภาคสนาม</span>
            <h1 className="mn-hero-title">NEDP</h1>
            <div className="mn-hero-sub">คู่มือการใช้งาน</div>
            <p className="mn-hero-lead">
              ทุกขั้นตอนของโครงการมุ่งเป้าสูงวัย รวบไว้ครบในหน้าเดียว — เปิดแอปจากเมนู LINE
              บันทึกคะแนน AAI ของผู้สูงอายุรายบุคคล แล้วติดตามพัฒนาการรายบุคคลและความคืบหน้าของพื้นที่ที่คุณดูแลได้ทันที
              โดยไม่ต้องจำรหัสผ่านแม้แต่ตัวเดียว
            </p>
            <div className="mn-hero-cta">
              <a href="#line" className="mn-cta">เริ่มอ่านคู่มือ <IconArrowRight size={18} /></a>
              <a href="#area" className="mn-cta--ghost">ดูแดชบอร์ด AAI</a>
            </div>
            <div className="mn-hero-stats" aria-label="โครงสร้างดัชนี AAI">
              <div className="mn-hero-stat"><strong>4</strong><span>มิติ AAI (D1–D4) · น้ำหนัก 30/15/30/25</span></div>
              <div className="mn-hero-stat"><strong>0–100</strong><span>คะแนน Overall AAI · รวมจาก 4 มิติแบบถ่วงน้ำหนัก</span></div>
              <div className="mn-hero-stat"><strong>64.6</strong><span>คะแนน AAI ฐาน · ข้อมูลปี 2564</span></div>
            </div>
          </div>
          <div className="mn-hero-media">
            <div className="mn-hero-glow" />
            <div className="mn-hero-3d"><Hero3DMount /></div>
            <InteractivePhone initial="home" className="mn-hero-phone" />
          </div>
        </div>
      </section>

      {/* ── บทบาทผู้ใช้ (roles map) ── */}
      <section id="roles" className="mn-section">
        <Reveal className="mn-wrap">
          <span className="mn-eyebrow"><span className="mn-eyebrow-dot" />บทบาทผู้ใช้</span>
          <h2 className="mn-h2">ระบบนี้ ใครใช้บ้าง</h2>
          <p className="mn-lead" style={{ maxWidth: "56em" }}>
            NEDP มีผู้ใช้ 4 กลุ่ม แต่ละกลุ่มเห็นและทำสิ่งที่ต่างกัน คู่มือนี้เขียนเพื่อ<strong>เจ้าหน้าที่ภาคสนาม</strong>เป็นหลัก
            โดยมีส่วนของหัวหน้าโครงการและผู้ดูแลระบบประกอบด้วย
          </p>
          <div className="mn-stagger" style={{ marginTop: 26, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
            {ROLES.map((r) => (
              <div key={r.name} className="mn-card" style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="mn-kpi-ico" style={{ background: "var(--accent-soft)", color: "var(--text-accent)" }}>
                    <r.icon size={20} stroke={1.9} />
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 17 }}>{r.name}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>{r.en}</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: 14.5, lineHeight: 1.5, color: "var(--text-muted)" }}>{r.who}</div>
                <ul className="mn-list" style={{ marginTop: 12, gap: 7 }}>
                  {r.can.map((c) => (
                    <li key={c} style={{ fontSize: 15, lineHeight: 1.5 }}><span className="mn-dot" style={{ marginTop: 7 }} />{c}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── 2 · เปิดจาก LINE ── */}
      <section id="line" className="mn-section mn-section--alt">
        <Reveal className="mn-wrap--narrow">
          <span className="mn-eyebrow"><span className="mn-num">01</span> · การเข้าใช้งาน</span>
          <h2 className="mn-h2">เปิดจาก LINE — ไม่มีหน้าล็อกอิน</h2>
          <p className="mn-lead">
            หลังเพิ่มเพื่อนกับบอท NEDP แล้ว การใช้งานทั้งหมดเริ่มจาก<strong>เมนูลัด (rich menu)</strong> ใต้ห้องแชท —
            แตะปุ่มที่ต้องการ ระบบจะยืนยันตัวตนผ่านบัญชี LINE ของคุณให้อัตโนมัติ
            ไม่มีหน้าล็อกอิน ไม่ต้องกรอกอีเมลหรือตั้งรหัสผ่าน
            ครั้งแรกที่เข้าระบบจะให้ลงทะเบียนผูกกับโครงการเพียงครั้งเดียว จากนั้นทุกครั้งเปิดแล้วใช้งานได้ทันที
          </p>
          <div style={{ margin: "14px 0 30px", display: "flex", flexWrap: "wrap", gap: 10 }}>
            <span className="mn-chip mn-chip--accent">ยืนยันตัวตนอัตโนมัติผ่าน LINE</span>
            <span className="mn-chip">เมนูลัด 6 ปุ่ม</span>
          </div>
          <figure className="mn-figure-card">
            {/* eslint-disable-next-line @next/next/no-img-element -- static /manual asset */}
            <img src="/manual/login-line-richmenu.png" alt="เมนูลัด (rich menu) ของบอท NEDP บน LINE" />
          </figure>
          <figcaption className="mn-figcap">เมนูลัด (rich menu) ของบอท NEDP บน LINE · <span style={{ color: "var(--text-accent)", fontWeight: 600 }}>ข้อมูลตัวอย่าง</span></figcaption>
        </Reveal>
      </section>

      {/* ── ลงทะเบียน & โปรไฟล์ ── */}
      <section id="account" className="mn-section">
        <Reveal className="mn-wrap--narrow">
          <span className="mn-eyebrow"><span className="mn-num">02</span> · ลงทะเบียน &amp; โปรไฟล์</span>
          <h2 className="mn-h2">ลงทะเบียนโครงการ แล้วพร้อมทำงาน</h2>
          <p className="mn-lead">
            ก่อนกรอกข้อมูลครั้งแรก มีเพียง 3 ขั้นตอนตั้งต้น — ยืนยันตัวตน ผูกกับโครงการ และเชื่อม LINE
            ทำครั้งเดียวจบ จากนั้นทุกอย่างพร้อมใช้งานถาวร
          </p>
          <div className="mn-stagger" style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
            {ACCOUNT_STEPS.map((s, i) => (
              <div key={s.t} className="mn-card" style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="mn-kpi-ico" style={{ background: "var(--accent-soft)", color: "var(--text-accent)" }}>
                    <s.icon size={20} stroke={1.9} />
                  </span>
                  <span className="mn-step-num">{i + 1}</span>
                </div>
                <div style={{ marginTop: 12, fontWeight: 700, fontSize: 17 }}>{s.t}</div>
                <div style={{ marginTop: 6, fontSize: 15, lineHeight: 1.55, color: "var(--text-secondary)" }}>{s.d}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 10 }}>
            <span className="mn-chip">บทบาท: เจ้าหน้าที่ภาคสนาม / หัวหน้าโครงการ</span>
            <span className="mn-chip mn-chip--accent">ลงทะเบียน = รับแจ้งเตือน LINE อัตโนมัติ</span>
            <span className="mn-chip mn-chip--outline">ออกจากโครงการ = หยุดแจ้งเตือน</span>
          </div>
        </Reveal>
      </section>

      {/* ── 3 · หน้าหลัก ── */}
      <section id="dashboard" className="mn-section mn-section--alt">
        <Reveal className="mn-wrap mn-split">
          <div className="mn-col-media">
            <InteractivePhone initial="home" />
          </div>
          <div className="mn-col-text">
            <span className="mn-eyebrow"><span className="mn-num">03</span> · หน้าหลัก</span>
            <h2 className="mn-h2">ภาพรวมทุกอย่างในหน้าเดียว</h2>
            <p className="mn-lead" style={{ marginBottom: 22 }}>
              เปิดแอปมาถึงหน้าหลัก ระบบทักทายด้วยชื่อของคุณ พร้อมการ์ดสรุป 4 ตัวที่ตอบคำถามสำคัญในพริบตา —
              รับผิดชอบกี่โครงการ เดือนนี้ส่งครบหรือยัง อันดับปัจจุบันอยู่ที่เท่าไร และเหลือเวลาอีกกี่วันก่อนถึงกำหนด
              ถัดลงมาคือรายการโครงการของคุณ แต่ละใบมีแถบความคืบหน้าและปุ่มลัดไป<strong>ส่งข้อมูล</strong>หรือ<strong>ดูสถานะ</strong>ได้ทันที
            </p>
            <div className="mn-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
              {[
                ["โครงการของฉัน", "1 โครงการ"],
                ["ส่งครบเดือนนี้", "0/1"],
                ["อันดับของฉัน", "— · 0 คะแนน"],
                ["เหลือเวลาส่ง", "22 วัน"],
              ].map(([l, v]) => (
                <div key={l} className="mn-card" style={{ padding: "14px 16px", borderRadius: 14 }}>
                  <div style={{ fontSize: 15, color: "var(--text-muted)", fontWeight: 600 }}>{l}</div>
                  <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)" }}>แถบนำทางล่าง · 4 แท็บ + เพิ่มเติม</div>
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                <span className="mn-chip mn-chip--accent">หน้าหลัก</span>
                <span className="mn-chip mn-chip--outline">ส่งข้อมูล</span>
                <span className="mn-chip mn-chip--outline">สถานะ</span>
                <span className="mn-chip mn-chip--outline">อันดับ</span>
                <span className="mn-chip mn-chip--outline" style={{ color: "var(--text-muted)", borderStyle: "dashed" }}>เพิ่มเติม ···</span>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── 4 · ส่งข้อมูล (sticky-phone crossfade) ── */}
      <section id="submit" className="mn-section">
        <div className="mn-wrap">
          <Reveal>
            <div style={{ maxWidth: "56em" }}>
              <span className="mn-eyebrow"><span className="mn-num">04</span> · ส่งข้อมูล</span>
              <h2 className="mn-h2">บันทึก AAI รายบุคคล</h2>
              <p className="mn-lead">
                การส่งข้อมูลใช้งานเหมือนการเปิดโฟลเดอร์ในคอมพิวเตอร์ — ไล่จากโครงการ ลงไปที่จังหวัด อำเภอ ตำบล
                จนถึงรายชื่อบุคคล แล้วบันทึกผลประเมิน AAI ในรอบเดือนนั้น ระบบจำโครงสร้างพื้นที่ของโครงการไว้ให้
                เดือนถัดไปจึงกลับมาส่งซ้ำได้ในไม่กี่แตะ
              </p>
              {/* folder path: โครงการ → จังหวัด → อำเภอ → ตำบล → รายบุคคล */}
              <div className="mn-path" aria-label="เส้นทางโฟลเดอร์ของการส่งข้อมูล">
                {FOLDER_PATH.map((p, i) => (
                  <Fragment key={p}>
                    {i > 0 && <IconChevronRight size={15} className="mn-path-sep" />}
                    <span className={`mn-path-node ${i === FOLDER_PATH.length - 1 ? "mn-path-node--accent" : ""}`}>{p}</span>
                  </Fragment>
                ))}
              </div>
            </div>
          </Reveal>
          <div style={{ marginTop: 30 }}>
            <StickyPhone steps={SUBMIT_STEPS} />
          </div>
          {/* ตำบล hub — 3 tabs */}
          <Reveal>
            <div className="mn-hub">
              <div className="mn-hub-title">ที่ระดับตำบล — 3 แท็บ</div>
              <div className="mn-hub-grid mn-stagger">
                {HUB_TABS.map((h) => (
                  <div key={h.t} className="mn-card">
                    <div className="mn-hub-card-title">{h.t}</div>
                    <div className="mn-hub-card-desc">{h.d}</div>
                  </div>
                ))}
              </div>
              <ul className="mn-list" style={{ marginTop: 18 }}>
                <li><IconShieldLock size={16} style={{ flex: "0 0 auto", marginTop: 2, color: "var(--text-accent)" }} />การเพิ่มผู้สูงอายุต้อง<strong>ขอความยินยอมก่อน (ตาม PDPA — กฎหมายคุ้มครองข้อมูลส่วนบุคคล)</strong> · ชื่อถูกเข้ารหัส และการค้นหาด้วยชื่อจะถูกบันทึกการเข้าถึงทุกครั้ง</li>
                <li><IconSearch size={16} style={{ flex: "0 0 auto", marginTop: 2, color: "var(--text-accent)" }} />แถบ “<strong>ให้คะแนนเดือนนี้แล้ว X/N คน</strong>” และตัวกรอง “ยังไม่ให้คะแนน” ช่วยให้ไล่กรอกครบไม่ตกหล่น · flag “<strong>ส่งต่อ</strong>” เตือนเคสที่ควรส่งต่อทางคลินิก</li>
                <li><IconTrash size={16} style={{ flex: "0 0 auto", marginTop: 2, color: "var(--danger)" }} /><strong>ลบข้อมูลบุคคลถาวร</strong>ได้ (ต้องยืนยันก่อน) — ลบทั้งคะแนนและชื่อที่เข้ารหัส กู้คืนไม่ได้</li>
              </ul>
            </div>
          </Reveal>
          <p className="mn-figcap" style={{ marginTop: 18 }}>
            ต้องการไฟล์ <strong style={{ color: "var(--text-secondary)" }}>Excel</strong>? ดาวน์โหลด<strong style={{ color: "var(--text-secondary)" }}>ข้อมูลดิบ</strong>ได้ที่หน้า <a href="#reports" style={{ color: "var(--text-accent)", fontWeight: 600, textDecoration: "none" }}>รายงาน</a> ·
            ภาพประกอบเป็นหน้าจอจริงจากระบบ — ชื่อและตัวเลขเป็นข้อมูลตัวอย่าง
          </p>
          <a href="#score" className="mn-jump">จากนั้นให้คะแนน AAI 4 มิติ <IconArrowRight size={17} /></a>
        </div>
      </section>

      {/* ── 5 · กรอกคะแนน AAI 4 มิติ ── */}
      <section id="score" className="mn-section mn-section--alt">
        <Reveal className="mn-wrap mn-split">
          <div className="mn-col-media">
            <PhoneFrame src="/manual/submit-form.png" alt="ฟอร์มกรอกคะแนน AAI" />
          </div>
          <div className="mn-col-text">
            <span className="mn-eyebrow"><span className="mn-num">05</span> · การให้คะแนน</span>
            <h2 className="mn-h2">คะแนน AAI ทั้ง 4 มิติ</h2>
            <p className="mn-lead" style={{ marginBottom: 20 }}>
              AAI (Active Ageing Index) คือดัชนีวัด “ความสูงวัยอย่างมีพลัง” มองผ่าน 4 มิติ
              แต่ละมิติมีคะแนน 0–100 (ยิ่งสูงยิ่งดี) แล้วระบบถ่วงน้ำหนักรวมเป็นคะแนนเดียวให้อัตโนมัติ
              โดยมิติการมีงานทำ (D1) และมิติสุขภาพดีและความมั่นคง (D3) มีน้ำหนักมากที่สุด มิติละ 30%
            </p>
            <div className="mn-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
              {DOMAINS.map((d) => (
                <div key={d.k} className="mn-card">
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, fontSize: 17 }}>{d.k}</span>
                    <span style={{ fontWeight: 700, fontSize: 22, color: "var(--text-accent)" }}>{d.w}%</span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 16, lineHeight: 1.5, color: "var(--text-primary)", fontWeight: 700 }}>{d.label}</div>
                  <div style={{ marginTop: 4, fontSize: 15, lineHeight: 1.5, color: "var(--text-secondary)" }}>{d.d}</div>
                  <div className="mn-bar"><i style={{ width: `${d.w}%` }} /></div>
                </div>
              ))}
            </div>
            <p className="mn-callout" style={{ marginTop: 18 }}>
              <IconInfoCircle size={17} style={{ flex: "0 0 auto", marginTop: 1 }} />
              <span>ไม่ว่าโครงการจะเก็บข้อมูลด้วยแบบสอบถามแบบใด ผลลัพธ์ที่แพลตฟอร์มสรุปให้เหมือนกันเสมอ — <strong>AAI 4 มิติ (D1–D4) + คะแนนรวม (Overall AAI)</strong></span>
            </p>
            <ul className="mn-list">
              <li><span className="mn-dot" />คะแนนรวม = D1×30% + D2×15% + D3×30% + D4×25% — คำนวณให้เห็นทันทีที่พิมพ์</li>
              <li><span className="mn-dot" />คะแนนเดือนแรกของแต่ละคนถูกเก็บเป็น<strong>ค่าตั้งต้น (baseline)</strong> ใช้เทียบพัฒนาการทุกรอบถัดไป</li>
              <li><span className="mn-dot" />บันทึกซ้ำเดือนเดิมได้ — ระบบเตือนก่อนว่าจะทับข้อมูลเดิม · เลือกเดือนที่ต้องการได้ ใช้ย้อนบันทึกเดือนก่อนหน้าก็ได้</li>
              <li><span className="mn-dot" style={{ background: "var(--success)" }} />โฟลเดอร์ตำบลเปลี่ยนเป็น<strong style={{ color: "var(--success-fg)" }}>สีเขียว</strong>เมื่อประเมินครบทุกคนในเดือนนั้น</li>
            </ul>
          </div>
        </Reveal>
      </section>

      {/* ── 6 · นำเข้าแบบสอบถาม (design-your-own questionnaire) ── */}
      <section id="questionnaire" className="mn-section">
        <div className="mn-wrap">
          <Reveal>
            <div style={{ maxWidth: "56em" }}>
              <span className="mn-eyebrow"><span className="mn-num">06</span> · แบบสอบถาม</span>
              <h2 className="mn-h2">ออกแบบแบบสอบถามของโครงการเอง</h2>
              <p className="mn-lead">
                ทุกโครงการ (ทั้ง 22 โครงการ) <strong>ออกแบบแบบสอบถามของตัวเอง</strong>แล้วนำเข้าสู่แพลตฟอร์ม NEDP ได้
                ที่หน้า <strong>“นำเข้าแบบสอบถาม”</strong> — เขียนคำถามเป็นไฟล์ JSON สั้น ๆ เห็นตัวอย่างจริงข้าง ๆ แบบเรียลไทม์
                แล้วใช้เก็บข้อมูลเฉพาะของโครงการคุณ · ไม่ว่าจะออกแบบอย่างไร ระบบจะคำนวณ<strong>คะแนน AAI มาตรฐาน</strong>ให้เสมอ
              </p>
            </div>

            {/* JSON box + live preview — mirrors the real "นำเข้าแบบสอบถาม" page */}
            <div style={{ marginTop: 26, display: "flex", flexWrap: "wrap", gap: "clamp(16px,2.5vw,26px)", alignItems: "stretch" }}>
              <div style={{ flex: "1 1 380px", minWidth: "min(100%,320px)", display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>รูปแบบไฟล์ (JSON)</div>
                <pre style={{ margin: 0, flex: "1 1 auto", padding: "16px 18px", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)", overflowX: "auto", fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: 12.5, lineHeight: 1.7, color: "var(--text-secondary)" }}>{QJSON_SAMPLE}</pre>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--success-fg)", background: "var(--success-bg)", padding: "5px 11px", borderRadius: 999 }}>✓ รูปแบบถูกต้อง</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-accent)", background: "var(--accent-soft)", padding: "5px 11px", borderRadius: 999 }}>✓ รวมส่วน AAI</span>
                </div>
              </div>
              <div style={{ flex: "1 1 320px", minWidth: "min(100%,300px)", display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>ตัวอย่างแบบสอบถามจริง (พรีวิว)</div>
                <div style={{ flex: "1 1 auto", border: "1px solid var(--border)", borderRadius: 16, background: "var(--page)", padding: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, borderLeft: "3px solid var(--accent)", paddingLeft: 10, marginBottom: 16 }}>แบบสอบถามความพึงพอใจโครงการ (ตัวอย่าง)</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>พึงพอใจกิจกรรมเพียงใด</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                    {["มากที่สุด", "มาก", "ปานกลาง", "น้อย", "น้อยที่สุด"].map((x) => (
                      <span key={x} className="mn-chip mn-chip--outline" style={{ fontSize: 13, padding: "6px 12px" }}>{x}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>จำนวนครั้งที่เข้าร่วม</div>
                  <div style={{ height: 38, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-1)", marginBottom: 16 }} />
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>กิจกรรมที่สนใจ (เลือกได้หลายข้อ)</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {["ออกกำลังกาย", "เข้าสังคม", "งานอดิเรก"].map((x) => (
                      <span key={x} className="mn-chip mn-chip--outline" style={{ fontSize: 13, padding: "6px 12px" }}>{x}</span>
                    ))}
                  </div>
                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px dashed var(--border)", fontSize: 13, color: "var(--text-accent)", fontWeight: 600 }}>+ ส่วนคำนวณ AAI (แนะนำ) — ระบบเพิ่มให้อัตโนมัติ</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span className="mn-chip mn-chip--outline">เลือกตอบ · radio</span>
              <span className="mn-chip mn-chip--outline">มาตร 1–5 · scale_5</span>
              <span className="mn-chip mn-chip--outline">ตัวเลข · number</span>
              <span className="mn-chip mn-chip--outline">เลือกได้หลายข้อ · checkbox_multi</span>
            </div>

            <p className="mn-callout" style={{ marginTop: 20 }}>
              <IconInfoCircle size={17} style={{ flex: "0 0 auto", marginTop: 1 }} />
              <span>แบบสอบถามชุดเดียว เก็บได้ <strong>2 อย่างพร้อมกัน</strong> — (1) <strong>คะแนนเฉพาะของโครงการ</strong> ที่คุณกำหนดเอง และ (2) <strong>คะแนน AAI มาตรฐาน</strong> (4 มิติ + คะแนนรวม) ที่ระบบคำนวณให้อัตโนมัติ</span>
            </p>

            <div className="mn-hub-title" style={{ marginTop: 26 }}>ขั้นตอนนำไปใช้จริง</div>
            <div className="mn-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 14 }}>
              {INTEGRATE_GATES.map((g) => (
                <div key={g.n} className="mn-card" style={{ padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="mn-kpi-ico" style={{ background: "var(--accent-soft)", color: "var(--text-accent)" }}>
                      <g.icon size={20} stroke={1.9} />
                    </span>
                    <span className="mn-step-num">{g.n}</span>
                  </div>
                  <div style={{ marginTop: 12, fontWeight: 700, fontSize: 17 }}>{g.t}</div>
                  <div style={{ marginTop: 6, fontSize: 15, lineHeight: 1.55, color: "var(--text-secondary)" }}>{g.d}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 10 }}>
              <span className="mn-chip mn-chip--outline">ใช้แบบสอบถามมาตรฐาน NEDP ได้ทันที (ไม่ต้องเขียนเอง)</span>
              <span className="mn-chip mn-chip--outline">อัปโหลดผู้สูงอายุทีละหลายคนด้วย Excel</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 6 · ดูผลรายบุคคล (live DS) ── */}
      <section id="result" className="mn-section">
        <Reveal className="mn-wrap mn-split">
          <div style={{ flex: "0 1 400px", minWidth: 300, display: "flex", justifyContent: "center", order: 1 }}>
            <div style={{ width: "100%", maxWidth: 400, border: "1px solid var(--border)", borderRadius: 24, background: "var(--page)", padding: "clamp(18px,2.4vw,26px)", boxShadow: "0 30px 60px -38px rgba(10,10,20,.4)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>ผู้สูงอายุตัวอย่าง</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>ตำบลตัวอย่าง ก · โครงการตัวอย่าง A</div>
                </div>
                <span style={{ padding: "6px 12px", borderRadius: 999, background: "var(--success-bg)", color: "var(--success-fg)", fontSize: 13, fontWeight: 700 }}>Δ +10.7</span>
              </div>
              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                <SummaryBox label="เริ่มต้น" value={49.9} />
                <SummaryBox label="เดือนที่แล้ว" value={55.2} />
                <SummaryBox label="ล่าสุด" value={60.6} highlight />
              </div>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <BarTriple label="AAI รวม" base={49.9} prev={55.2} latest={60.6} />
                <BarTriple label="มิติ 4 · สภาพแวดล้อม" base={53.8} prev={59} latest={63.2} />
              </div>
              <div style={{ marginTop: 16 }}>
                <DimensionHighlightCards
                  strongest={{ label: "มิติ 4 · สภาพแวดล้อม", v: 63.2 }}
                  weakest={{ label: "มิติ 1 · การมีงานทำ/รายได้", v: 52.2 }}
                />
              </div>
            </div>
          </div>
          <div className="mn-col-text" style={{ order: 2 }}>
            <span className="mn-eyebrow"><span className="mn-num">07</span> · ผลรายบุคคล</span>
            <h2 className="mn-h2">ดูพัฒนาการรายบุคคล</h2>
            <p className="mn-lead">
              ทุกคะแนนที่บันทึกไม่ได้หายไปไหน — ระบบร้อยเรียงเป็นเส้นพัฒนาการของผู้สูงอายุแต่ละคน
              เทียบ 3 ช่วงเวลา <strong>เริ่มต้น → เดือนที่แล้ว → ล่าสุด</strong> พร้อมค่าเปลี่ยนแปลง Δ
              ที่บอกชัดว่าดีขึ้นหรือถดถอยเท่าไร การ์ด<strong>จุดเด่น / ควรพัฒนา</strong>ชี้มิติที่แข็งแรงที่สุด
              และมิติที่ควรออกแบบกิจกรรมเสริม — ใช้วางแผนดูแลรายคนได้ตรงจุด
            </p>
            <div className="mn-chip mn-chip--accent" style={{ marginTop: 16 }}>✦ ตัวอย่างหน้าจอจริงจากระบบ NEDP</div>
          </div>
        </Reveal>
      </section>

      {/* ── 7 · AAI Area Dashboard (live DS) ── */}
      <section id="area" className="mn-section mn-section--alt">
        <div className="mn-wrap">
          <Reveal>
            <div style={{ maxWidth: "56em" }}>
              <span className="mn-eyebrow"><span className="mn-num">08</span> · แดชบอร์ด</span>
              <h2 className="mn-h2">แดชบอร์ด AAI รายพื้นที่</h2>
              <p className="mn-lead">
                มุมมองสำหรับหัวหน้าโครงการและผู้ดูแลระบบ — เห็นภาพรวมของทั้งพื้นที่ในหน้าเดียว
                ไล่เจาะข้อมูลจาก <strong>จังหวัด → อำเภอ → ตำบล → รายบุคคล</strong> ได้ถึงระดับรหัสประจำตัวบุคคล
                (ส่วนผู้บริหารดูได้เฉพาะภาพรวม ไม่เห็นรายบุคคล) วางเปรียบเทียบพร้อมกันได้สูงสุด 5 พื้นที่
                เพื่อดูว่าที่ใดก้าวหน้าหรือต้องการการสนับสนุน และถ้าตำบลไหนมีผู้ถูกประเมินน้อยกว่า 5 คน
                ระบบจะปิดตัวเลขไว้ เพื่อไม่ให้เดาย้อนได้ว่าเป็นใคร (เรียกว่า k-anonymity)
              </p>
            </div>
            <div className="mn-grid-auto mn-stagger" style={{ marginTop: 26 }}>
              {KPIS.map((k) => (
                <div key={k.label} className="mn-kpi">
                  <div className="mn-kpi-ico" style={{ background: `color-mix(in srgb, ${k.tint} 15%, transparent)`, color: k.tint }}>
                    <k.icon size={20} stroke={1.9} />
                  </div>
                  <div className="mn-kpi-num"><CountUp value={k.num} decimals={k.dec} /></div>
                  <div className="mn-kpi-label">{k.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 10 }}>
              <span className="mn-chip">เปรียบเทียบได้สูงสุด 5 พื้นที่</span>
              <span className="mn-chip">ปิดข้อมูลกลุ่มเล็ก (k-anonymity)</span>
              <span className="mn-chip mn-chip--accent">โหมดตัวอย่าง</span>
            </div>
          </Reveal>

          <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: "clamp(18px,3vw,28px)", alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 500px", minWidth: "min(100%,320px)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>เปรียบเทียบพื้นที่</div>
              <AaiComparePanel
                rows={cmp}
                nameOf={(r) => r.tambonTh}
                onRemove={(g) => setCmp((c) => c.filter((r) => r.geoCode !== g))}
                onClear={() => setCmp(COMPARE_ROWS)}
              />
            </div>
            <div style={{ flex: "1 1 320px", minWidth: "min(100%,300px)", maxWidth: 400 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>การ์ดพื้นที่ (ดูรายมิติ)</div>
              <AreaCard
                r={AREA_ROW}
                name="ตำบลตัวอย่าง ก"
                sub="อำเภอตัวอย่าง · จังหวัดตัวอย่าง"
                drillLabel={null}
                onDrill={null}
                compareMode={false}
                picked={false}
                onTogglePick={() => {}}
                pickDisabled={false}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── รายงานและส่งออกข้อมูล ── */}
      <section id="reports" className="mn-section">
        <div className="mn-wrap">
          <Reveal>
            <div style={{ maxWidth: "56em" }}>
              <span className="mn-eyebrow"><span className="mn-num">09</span> · รายงาน</span>
              <h2 className="mn-h2">รายงานและส่งออกข้อมูล</h2>
              <p className="mn-lead">
                เมื่อบันทึกข้อมูลแล้ว หน้า<strong>รายงาน</strong>คือที่รวมทุกอย่างสำหรับส่งต่อและวิเคราะห์ —
                ส่งออกข้อมูลดิบเป็น Excel ดาวน์โหลดรายงานฉบับเต็ม และดูภาพรวมผลงานของคุณ
                โดยข้อมูลบุคคลทั้งหมดใช้ <strong>รหัสประจำตัว</strong> แทนชื่อจริงเพื่อความเป็นส่วนตัว
              </p>
            </div>
            <div className="mn-stagger" style={{ marginTop: 26, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 14 }}>
              {REPORTS.map((r) => (
                <div key={r.t} className="mn-card" style={{ padding: 20 }}>
                  <span className="mn-kpi-ico" style={{ background: `color-mix(in srgb, ${r.tint} 15%, transparent)`, color: r.tint }}>
                    <r.icon size={20} stroke={1.9} />
                  </span>
                  <div style={{ marginTop: 12, fontWeight: 700, fontSize: 17 }}>{r.t}</div>
                  <div style={{ marginTop: 6, fontSize: 15, lineHeight: 1.55, color: "var(--text-secondary)" }}>{r.d}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span className="mn-chip mn-chip--outline"><IconDownload size={14} /> เลือกรายเดือน หรือ ทั้งหมด</span>
              <span className="mn-chip mn-chip--outline"><IconFileSpreadsheet size={14} /> Excel หลายชีต</span>
              <span className="mn-chip mn-chip--outline"><IconFileText size={14} /> PDF / Word</span>
              <span className="mn-chip mn-chip--accent">ใช้รหัส ไม่เปิดเผยชื่อ</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 8 · สถานะ / จัดการ ── */}
      <section id="status" className="mn-section mn-section--alt">
        <Reveal className="mn-wrap mn-split">
          <div className="mn-col-media">
            <InteractivePhone initial="status" />
          </div>
          <div className="mn-col-text">
            <span className="mn-eyebrow"><span className="mn-num">10</span> · สถานะ</span>
            <h2 className="mn-h2">ติดตามสถานะ &amp; จัดการพื้นที่</h2>
            <p className="mn-lead" style={{ marginBottom: 22 }}>
              แท็บ<strong>สถานะ</strong>รวมทุกโครงการที่คุณรับผิดชอบไว้ที่เดียว แต่ละใบแสดงแถบความคืบหน้า
              “ส่งแล้ว x/y พื้นที่” ของรอบเดือนปัจจุบัน พร้อมป้ายสีบอกขั้นของงาน —
              เห็นปุ๊บรู้ปั๊บว่าโครงการไหนเรียบร้อยแล้ว โครงการไหนยังค้าง
              จากหน้าเดียวกันนี้ยังเข้าไปจัดการรายชื่อพื้นที่ ยืนยันพื้นที่ และดูกิจกรรมของทีมได้ด้วย
            </p>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12 }}>ป้ายสถานะ</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <StatusBadge status="submitted" />
              <StatusBadge status="approved" />
              <StatusBadge status="draft" />
              <StatusBadge status="not_started" />
              <StatusBadge status="rejected" />
            </div>
          </div>
        </Reveal>
        <Reveal>
          <div className="mn-wrap" style={{ marginTop: "clamp(28px,4vw,44px)" }}>
            <div className="mn-hub-title">ในหน้าจัดการ ทำอะไรได้บ้าง</div>
            <div className="mn-hub-grid mn-stagger">
              {[
                { icon: IconMapPinCheck, t: "จัดการ & ยืนยันพื้นที่", d: "เพิ่ม/แก้/ลบ รายชื่อพื้นที่ (ลบไม่ได้ถ้าส่งข้อมูลแล้ว) และ “ยืนยันพื้นที่” — ระบบบันทึกผู้ยืนยันและเวลาไว้เป็นหลักฐาน" },
                { icon: IconEdit, t: "ขอแก้ไข → รออนุมัติ", d: "ข้อมูลที่ส่งแล้วถูกล็อก หากต้องแก้ กด “ขอแก้ไข” ผู้ดูแลอนุมัติแล้วจึงแก้ได้ · ระบบแจ้งเตือนสถานะให้" },
                { icon: IconUsersGroup, t: "กิจกรรมทีม (หัวหน้าโครงการ)", d: "หัวหน้าโครงการเห็นฟีดว่าใครทำอะไร — ลงทะเบียน บันทึกคะแนน ส่งข้อมูล แก้ไข ลบ — เรียงล่าสุดก่อน" },
                { icon: IconUsers, t: "หัวหน้าโครงการ", d: "ขอเป็นหัวหน้าโครงการ (ผู้ดูแลอนุมัติ) · เมื่อเป็นหัวหน้าจะเห็นการส่งข้อมูลรายเดือนของสมาชิกแต่ละคน" },
                { icon: IconChecklist, t: "ประวัติการส่งของฉัน", d: "ดูย้อนหลังว่าส่งครบกี่พื้นที่ในแต่ละเดือน พร้อมวันที่ส่ง" },
                { icon: IconLogout, t: "ออกจากโครงการ", d: "ออกจากโครงการได้ทั้งบนเว็บและผ่านบอท — หยุดรับการแจ้งเตือน (ข้อมูลที่ส่งไว้ยังอยู่)" },
              ].map((c) => (
                <div key={c.t} className="mn-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="mn-kpi-ico" style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent-soft)", color: "var(--text-accent)" }}>
                      <c.icon size={17} stroke={1.9} />
                    </span>
                    <span className="mn-hub-card-title">{c.t}</span>
                  </div>
                  <div className="mn-hub-card-desc" style={{ marginTop: 8 }}>{c.d}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── 9 · อันดับ ── */}
      <section id="leaderboard" className="mn-section">
        <Reveal className="mn-wrap mn-split">
          <div className="mn-col-text" style={{ order: 2 }}>
            <span className="mn-eyebrow"><span className="mn-num">11</span> · อันดับ</span>
            <h2 className="mn-h2">อันดับการส่งข้อมูล</h2>
            <p className="mn-lead" style={{ marginBottom: 20 }}>
              เพื่อให้การส่งข้อมูลตรงเวลาเป็นเรื่องสนุก ระบบให้คะแนนทุกเดือนตามหลักง่าย ๆ —
              <strong>ส่งครบทุกพื้นที่ ก่อนกำหนด และยิ่งเร็วยิ่งได้คะแนนมาก</strong>
              สามอันดับแรกขึ้นโพเดียมพร้อมเหรียญรางวัล ตามด้วยตารางอันดับทั้งหมดที่ไฮไลต์แถวของคุณให้เห็นง่าย ๆ
              สลับดูอันดับย้อนหลังหรือสถิติผู้ส่งเร็วที่สุดได้จากแท็บด้านบน
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span className="mn-chip mn-chip--accent">เดือนนี้</span>
              <span className="mn-chip mn-chip--outline">ย้อนหลัง</span>
              <span className="mn-chip mn-chip--outline">ส่งเร็วที่สุด</span>
            </div>
          </div>
          <div className="mn-col-media" style={{ order: 1 }}>
            <InteractivePhone initial="rank" />
          </div>
        </Reveal>
      </section>

      {/* ── 10 · การแจ้งเตือน (สองช่องทาง) ── */}
      <section id="notify" className="mn-section mn-section--alt">
        <div className="mn-wrap--narrow">
          <Reveal>
            <div style={{ maxWidth: "56em" }}>
              <span className="mn-eyebrow"><span className="mn-num">12</span> · การแจ้งเตือน</span>
              <h2 className="mn-h2">แจ้งเตือนสองช่องทาง</h2>
              <p className="mn-lead">
                ไม่ต้องกลัวพลาดกำหนดส่ง — การแจ้งเตือนสำคัญมาถึงคุณพร้อมกันสองทาง คือ<strong>กระดิ่งในแอป</strong>
                ที่รวมงานค้างและคำขออนุมัติไว้เป็นรายการ และ<strong>ข้อความจากบอทใน LINE</strong>
                ที่เด้งถึงมือถือทันทีเมื่อใกล้กำหนด เลยกำหนด หรือมีผลการอนุมัติ
                ส่งข้อมูลครบเมื่อไร ระบบหยุดเตือนให้เองโดยอัตโนมัติ
              </p>
            </div>
          </Reveal>
          <div style={{ marginTop: 26, display: "flex", flexWrap: "wrap", gap: "clamp(18px,3vw,28px)", alignItems: "stretch" }}>
            {/* in-app bell */}
            <div style={{ flex: "1 1 340px", minWidth: "min(100%,300px)", border: "1px solid var(--border)", borderRadius: 22, background: "var(--page)", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ position: "relative", color: "var(--text-primary)", display: "inline-flex" }}>
                  <IconBell size={20} stroke={1.9} />
                  <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: 999, background: "var(--danger)", border: "1.5px solid var(--page)" }} />
                </span>
                <span style={{ fontWeight: 700, fontSize: 15 }}>กระดิ่งในแอป</span>
              </div>
              <ul style={{ margin: 0, padding: 8, listStyle: "none", display: "flex", flexDirection: "column" }}>
                {BELL.map((b) => (
                  <li key={b.title} style={{ display: "flex", gap: 12, padding: 12, borderRadius: 12, alignItems: "flex-start" }}>
                    <span style={{ flex: "0 0 auto", width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", ...style(BELL_TINT[b.tint]) }}>
                      <b.icon size={17} stroke={2} />
                    </span>
                    <span>
                      <span style={{ display: "block", fontWeight: 700, fontSize: 14 }}>{b.title}</span>
                      <span style={{ display: "block", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.45 }}>{b.sub}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {/* LINE chat */}
            <div style={{ flex: "1 1 340px", minWidth: "min(100%,300px)", border: "1px solid var(--border)", borderRadius: 22, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "14px 18px", background: "#06C755", color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,.22)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>N</span>
                <span style={{ fontWeight: 700, fontSize: 15 }}>บอท NEDP</span>
                <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.9 }}>LINE Official</span>
              </div>
              <div style={{ flex: "1 1 auto", padding: 18, background: "linear-gradient(180deg,#8fb0d8,#9ec0e0)", display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { badge: <StatusBadge status="approved" />, text: "โครงการตัวอย่าง C รอบ มิ.ย. 2569 ได้รับการอนุมัติแล้ว ขอบคุณที่ส่งครบทุกพื้นที่" },
                  { badge: <StatusBadge status="rejected" />, text: 'ตำบลตัวอย่าง ข ถูกตีกลับ — กรุณาตรวจสอบ "จำนวนผู้เข้าร่วม" แล้วส่งใหม่' },
                  { badge: <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, background: "var(--warning-bg)", color: "var(--warning-fg)", fontSize: 12, fontWeight: 700 }}>เตือนใกล้กำหนด</span>, text: "เหลืออีก 3 วันก่อนปิดรอบเดือนนี้ (30 มิ.ย. 2569)" },
                ].map((m, i) => (
                  <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-end" }}>
                    <span style={{ flex: "0 0 auto", width: 32, height: 32, borderRadius: 999, background: "#1a56db", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>N</span>
                    <div style={{ maxWidth: "80%", background: "#fff", borderRadius: "4px 16px 16px 16px", padding: "12px 14px", boxShadow: "0 1px 2px rgba(0,0,0,.12)" }}>
                      <div style={{ marginBottom: 6 }}>{m.badge}</div>
                      <div style={{ fontSize: 14.5, lineHeight: 1.5, color: "#0a0a0a" }}>{m.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p style={{ margin: "16px 2px 0", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15, color: "var(--text-accent)", fontWeight: 600 }}>
            <IconInfoCircle size={16} />ทั้งสองช่องทางเชื่อมกัน — จะอ่านหรือจัดการงานค้างจากแอปหรือจาก LINE ก็ได้
          </p>
        </div>
      </section>

      {/* ── 11 · คำเชิญลงพื้นที่ (LINE Flex) ── */}
      <section id="invite" className="mn-section">
        <Reveal className="mn-wrap--narrow mn-split">
          <div className="mn-col-text">
            <span className="mn-eyebrow"><span className="mn-num">13</span> · นัดหมาย</span>
            <h2 className="mn-h2">คำเชิญลงพื้นที่ / นัดประชุม</h2>
            <p className="mn-lead">บอทส่งการ์ดเชิญแบบกดปุ่มตอบรับได้ในแชท LINE พร้อมรายละเอียดจังหวัด สถานที่ และโครงการ แตะปุ่มเพื่อตอบรับได้ทันที <strong>ระบบบันทึกผลตอบรับอัตโนมัติ</strong> และเปลี่ยนใจตอบใหม่ได้</p>
          </div>
          <div style={{ flex: "0 1 360px", minWidth: 290, display: "flex", justifyContent: "center" }}>
            <div style={{ width: "100%", maxWidth: 340, borderRadius: 18, overflow: "hidden", background: "#fff", boxShadow: "0 30px 60px -34px rgba(10,10,20,.45)", border: "1px solid var(--border)" }}>
              <div style={{ height: 96, background: "linear-gradient(120deg,#1a56db,#00b48a)", display: "flex", alignItems: "flex-end", padding: "14px 18px" }}>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>นัดลงพื้นที่ตรวจสอบ</span>
              </div>
              <div style={{ padding: 18 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* the card mimics a LINE Flex message — always light, so colors are fixed (not theme vars) */}
                  {[["จังหวัด", "จังหวัดตัวอย่าง"], ["วัน-เวลา", "15 ก.ค. 2569 · 09.00 น."], ["สถานที่", "อบต.ตัวอย่าง"], ["โครงการ", "โครงการตัวอย่าง A, C"]].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", gap: 12 }}>
                      <span style={{ flex: "0 0 88px", fontSize: 13.5, color: "#5a5a5c", fontWeight: 600 }}>{k}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#0a0a0a" }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 9 }}>
                  <button type="button" style={{ width: "100%", padding: 12, border: "none", borderRadius: 10, background: "#06C755", color: "#fff", fontWeight: 700, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit" }}>✓ จะเข้าร่วม</button>
                  <button type="button" style={{ width: "100%", padding: 12, border: "1px solid #e5e5e5", borderRadius: 10, background: "#fff", color: "#0a0a0a", fontWeight: 700, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit" }}>ไม่สะดวก</button>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── ตัวคั่น: ส่วนขั้นสูง (หัวหน้าโครงการ / ผู้ดูแล / ผู้บริหาร) ── */}
      <section className="mn-section mn-section--alt" style={{ paddingTop: "clamp(40px,6vw,72px)", paddingBottom: "clamp(26px,4vw,40px)" }}>
        <div className="mn-wrap" style={{ textAlign: "center" }}>
          <span className="mn-eyebrow" style={{ justifyContent: "center" }}><span className="mn-eyebrow-dot" />ส่วนขั้นสูง</span>
          <h2 className="mn-h2" style={{ fontSize: "clamp(26px,3.4vw,40px)" }}>สำหรับผู้ดูแลระบบ</h2>
          <p className="mn-lead" style={{ margin: "12px auto 0", maxWidth: "46em" }}>
            ส่วนนี้ไม่ใช่งานประจำวันของเจ้าหน้าที่ภาคสนาม แต่รวมไว้ให้เห็นภาพรวมทั้งระบบ
          </p>
        </div>
      </section>

      {/* ── คอนโซลผู้ดูแลระบบ (admin) ── */}
      <section id="admin" className="mn-section mn-section--alt">
        <div className="mn-wrap">
          <Reveal>
            <div style={{ maxWidth: "56em" }}>
              <span className="mn-eyebrow"><span className="mn-eyebrow-dot" />ผู้ดูแลระบบ</span>
              <h2 className="mn-h2">คอนโซลผู้ดูแลระบบ</h2>
              <p className="mn-lead">
                ผู้ดูแลระบบเข้าผ่าน<strong>รหัสผ่านกลาง</strong> (แยกจากบัญชี LINE) เห็นทุกโครงการ
                และดูแลงานภาพรวมทั้งหมด — ไม่ได้ใช้กรอกข้อมูลรายวัน แต่ไว้จัดการ อนุมัติ และตั้งค่าระบบ
              </p>
            </div>
            {/* central-password login gate — schematic mock (matches the app theme, no live data) */}
            <div style={{ marginTop: 22, maxWidth: 360, border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", background: "var(--surface-1)" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)", display: "flex", alignItems: "center", gap: 8 }}>
                <IconShieldLock size={16} style={{ color: "var(--text-accent)" }} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>เข้าสู่คอนโซลผู้ดูแลระบบ</span>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>รหัสผ่านกลาง</div>
                <div style={{ padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, background: "var(--surface-2)", fontSize: 15, letterSpacing: 4, color: "var(--text-secondary)" }}>••••••••••</div>
                <div style={{ marginTop: 12, padding: "9px 12px", borderRadius: 8, background: "var(--hero)", color: "var(--on-primary)", textAlign: "center", fontWeight: 700, fontSize: 14 }}>เข้าสู่ระบบ</div>
              </div>
            </div>
            <figcaption className="mn-figcap" style={{ marginTop: 8 }}>หน้าเข้าสู่ระบบผู้ดูแล · <span style={{ color: "var(--text-accent)", fontWeight: 600 }}>ตัวอย่างหน้าจอ</span></figcaption>
            <div className="mn-stagger" style={{ marginTop: 26, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
              {ADMIN_PAGES.map((p) => (
                <div key={p.t} className="mn-card" style={{ padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="mn-kpi-ico" style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent-soft)", color: "var(--text-accent)" }}>
                      <p.icon size={17} stroke={1.9} />
                    </span>
                    <span className="mn-hub-card-title">{p.t}</span>
                  </div>
                  <div className="mn-hub-card-desc" style={{ marginTop: 8 }}>{p.d}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20 }}>
              <span className="mn-chip"><IconShieldLock size={14} /> เข้าด้วยรหัสผ่านกลาง แยกจาก LINE</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── PART 2 · AAI Index (Thai Adapted Version) ── */}
      <section id="part2" className="mn-section mn-section--alt" style={{ paddingLeft: "clamp(20px,5vw,44px)", paddingRight: "clamp(20px,5vw,44px)" }}>
        <Reveal>
          <div className="mn-wrap--narrow" style={{ border: "1.5px solid var(--border)", borderRadius: 26, overflow: "hidden", background: "color-mix(in srgb, var(--accent-soft) 28%, var(--page))" }}>
            <div style={{ padding: "14px 22px", background: "var(--accent-soft)", color: "var(--text-accent)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderBottom: "1.5px solid var(--border)" }}>
              <IconInfoCircle size={18} />
              <span style={{ fontWeight: 700, fontSize: 17 }}>AAI Index · ดัชนีพฤฒพลัง (ความสูงวัยอย่างมีพลัง)</span>
              <span style={{ padding: "3px 11px", borderRadius: 999, background: "var(--text-accent)", color: "#fff", fontSize: 12, fontWeight: 700 }}>ฉบับปรับสำหรับไทย · 2567</span>
            </div>
            <div style={{ padding: "clamp(24px,4vw,52px)" }}>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: "clamp(22px,2.4vw,29px)" }}>โครงสร้างการให้คะแนน AAI · 4 มิติ (D1–D4)</h3>
              <p style={{ margin: "12px 0 0", maxWidth: "52em", fontSize: 16, lineHeight: 1.6, color: "var(--text-secondary)" }}>
                โครงสร้างการประเมินฉบับปรับสำหรับไทย — ชุดตัวชี้วัดมาตรฐานจัดกลุ่มเป็น 4 มิติ (D1–D4)
                แล้วถ่วงน้ำหนัก 30/15/30/25 เป็นคะแนนรวม 0–100 อ้างอิงกรอบ UNECE (2019) · ASEAN AAI · สำนักงานสถิติแห่งชาติ (เผยแพร่ 2567)
                โดยใช้ข้อมูลสำรวจปี 2564 เป็นฐาน — คะแนนฐานของประเทศอยู่ที่ <strong>64.6</strong>
              </p>
              <div className="mn-stagger" style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
                {PART2.map((p) => (
                  <div key={p.k} className="mn-card" style={{ padding: 18 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontWeight: 700 }}>{p.k}</span>
                      <span style={{ fontWeight: 700, color: "var(--text-accent)" }}>{p.w}</span>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 15, color: "var(--text-muted)" }}>{p.d}</div>
                  </div>
                ))}
              </div>
              <p style={{ margin: "12px 2px 0", fontSize: 14, color: "var(--text-muted)" }}>น้ำหนักรวม D1 30% + D2 15% + D3 30% + D4 25% = 100% → คะแนน Overall AAI 0–100</p>

              {/* interactive calculator — the embedded standalone AAI tool */}
              <div style={{ marginTop: 30, paddingTop: 22, borderTop: "1.5px solid var(--border)" }}>
                <h4 style={{ margin: 0, fontWeight: 700, fontSize: "clamp(17px,1.7vw,20px)" }}>เครื่องคำนวณ AAI — ลองปรับค่าดูผลได้เอง</h4>
                <p style={{ margin: "10px 0 0", maxWidth: "52em", fontSize: 15, lineHeight: 1.6, color: "var(--text-secondary)" }}>
                  ลากแถบเลื่อนของแต่ละตัวชี้วัดเพื่อดูว่าคะแนนแต่ละมิติและคะแนนรวม AAI เปลี่ยนอย่างไร — ค่าเริ่มต้นคือข้อมูลจริงของประเทศปี 2564 (คะแนนฐาน 64.6)
                  <br />
                  <span style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
                    หมายเหตุ: เครื่องคำนวณนี้เป็นสื่อประกอบเชิงวิชาการ (อิงกรอบ UNECE ฉบับปรับสำหรับไทย) เพื่ออธิบายหลักการถ่วงน้ำหนัก 4 มิติ — ระบบให้คะแนนจริงของแอปใช้ค่าน้ำหนัก 30/15/30/25 เช่นกัน โดยคำนวณจากแบบประเมินรายบุคคลอัตโนมัติ
                  </span>
                </p>
                <AaiDashboardFrame />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── ช่วยเหลือ & แจ้งปัญหา ── */}
      <section id="help" className="mn-section">
        <Reveal className="mn-wrap--narrow">
          <span className="mn-eyebrow"><span className="mn-num">14</span> · ช่วยเหลือ</span>
          <h2 className="mn-h2">ติดขัดตรงไหน มีทางออกเสมอ</h2>
          <p className="mn-lead">หน้า<strong>ช่วยเหลือ</strong>รวมคู่มือ คำถามพบบ่อย และการแจ้งปัญหาไว้ในที่เดียว — พบข้อผิดพลาดแจ้งได้ทันที พร้อมเลขติดตาม</p>
          <div className="mn-stagger" style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
            {HELP_CARDS.map((h) => (
              <div key={h.t} className="mn-card" style={{ padding: 20 }}>
                <span className="mn-kpi-ico" style={{ background: "var(--accent-soft)", color: "var(--text-accent)" }}>
                  <h.icon size={20} stroke={1.9} />
                </span>
                <div style={{ marginTop: 12, fontWeight: 700, fontSize: 17 }}>{h.t}</div>
                <div style={{ marginTop: 6, fontSize: 15, lineHeight: 1.55, color: "var(--text-secondary)" }}>{h.d}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── ฟังก์ชันทั้งหมด (feature index) ── */}
      <section id="features" className="mn-section mn-section--alt">
        <div className="mn-wrap">
          <Reveal>
            <div style={{ maxWidth: "56em" }}>
              <span className="mn-eyebrow"><span className="mn-num">15</span> · สรุปฟังก์ชัน</span>
              <h2 className="mn-h2">ฟังก์ชันทั้งหมดในที่เดียว</h2>
              <p className="mn-lead">ภาพรวมความสามารถทุกอย่างของระบบ จัดกลุ่มตามเมนู เพื่อให้เห็นครบว่าทำอะไรได้บ้าง</p>
            </div>
          </Reveal>
          <Reveal>
            <div className="mn-findex">
              {FEATURE_INDEX.map((g) => (
                <div key={g.group} className="mn-findex-col">
                  <div className="mn-findex-head">
                    <span className="mn-findex-ico"><g.icon size={17} stroke={1.9} /></span>
                    {g.group}
                  </div>
                  <ul className="mn-findex-list">
                    {g.items.map((it) => (
                      <li key={it}><span className="mn-findex-dot" />{it}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 15 · ปิดท้าย / ติดต่อ ── */}
      <section id="contact" className="mn-section" style={{ paddingTop: "clamp(56px,8vw,120px)", paddingBottom: "clamp(56px,8vw,120px)" }}>
        <div className="mn-wrap--narrow">
          <Reveal>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(32px,5vw,64px)", alignItems: "stretch" }}>
              <div style={{ flex: "1 1 400px", minWidth: "min(100%,320px)" }}>
                <span className="mn-eyebrow"><span className="mn-num">16</span> · สรุป</span>
                <h2 className="mn-h2">พร้อมเริ่มใช้งานแล้ว</h2>
                <ul style={{ margin: "22px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                  {CHECKLIST.map((c) => (
                    <li key={c} style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 17, lineHeight: 1.55, color: "var(--text-secondary)" }}>
                      <span style={{ flex: "0 0 auto", width: 22, height: 22, borderRadius: 999, background: "var(--success-bg)", color: "var(--success-fg)", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                        <IconCircleCheck size={14} stroke={2.4} />
                      </span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ flex: "1 1 320px", minWidth: "min(100%,300px)", display: "flex" }}>
                <div className="mn-contact-card" style={{ width: "100%", padding: "clamp(26px,3.5vw,40px)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 44, height: 44, borderRadius: 11, background: "#1a56db", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 24 }}>N</span>
                    <div><div style={{ fontWeight: 700, fontSize: 20 }}>NEDP</div><div style={{ fontSize: 15, color: "rgba(255,255,255,.82)" }}>มุ่งเป้าสูงวัย</div></div>
                  </div>
                  <div style={{ margin: "24px 0 0", fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,.74)" }}>เพิ่มเพื่อน Official Account</div>
                  {/* OA add-friend: tap — opens a chat with your NEDP bot. Add your own /manual/oa-qr.png
                      (a QR of your LINE OA add-friend link) and an <img> here if you want a scannable QR too. */}
                  <div className="mn-oa">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 17 }}>แชทกับบอท NEDP</div>
                      <div style={{ fontSize: 14.5, color: "rgba(255,255,255,.82)", marginTop: 2 }}>แตะปุ่มด้านล่างเพื่อเพิ่มเพื่อน แล้วเริ่มใช้งานจากเมนูในแชท</div>
                      <a href="https://line.me/R/ti/p/@your-line-oa-id" target="_blank" rel="noopener noreferrer" style={{ marginTop: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, padding: "12px 20px", borderRadius: 999, background: "#06C755", color: "#fff", fontWeight: 700, fontSize: 17, textDecoration: "none" }}>
                        <IconBrandLine size={19} stroke={2} />เพิ่มเพื่อน (Official)
                      </a>
                    </div>
                  </div>
                  <a href="https://line.me/ti/p/-your-team-line-id" target="_blank" rel="noopener noreferrer" style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 999, border: "1px solid rgba(255,255,255,.28)", color: "#fff", fontWeight: 700, fontSize: 16, textDecoration: "none" }}>
                    <span style={{ width: 20, height: 20, borderRadius: 5, background: "rgba(255,255,255,.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>L</span>
                    ติดต่อทีมงาน (LINE)
                  </a>
                  <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,.85)", fontSize: 16.5 }}>
                    <IconClock size={18} stroke={1.9} />เวลาทำการ · จันทร์–ศุกร์ 08.30–16.30 น.
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal>
            <div style={{ marginTop: "clamp(28px,4vw,44px)" }}>
              <ShareManual />
            </div>
          </Reveal>
          <div style={{ margin: "36px 0 0", paddingTop: 22, borderTop: "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>NEDP · คู่มือการใช้งานสำหรับเจ้าหน้าที่ภาคสนาม · ข้อมูลตัวอย่างทั้งหมด</span>
          </div>
        </div>
      </section>
    </div>
  );
}
