# NEDP app — real product spec (build SCREENS accurately)

This design system ships the NEDP UI **components**. This file documents the **real product** they
compose into, so any screen or deck you design depicts the app that actually exists — not an invented
one. NEDP ("มุ่งเป้าสูงวัย") is a **Thai-first, mobile LIFF app**: it runs inside the **LINE** app
(opened from the bot's rich menu), Next.js 15, ~390px mobile width.

## Identity / "login" — there is NO login screen
Auth is implicit: the user opens the **LIFF link from the LINE bot's rich menu**, LINE provides the
profile, and the app logs them in automatically (no email/password, no "Sign in with LINE" page).
Depict "การเข้าใช้งาน" as **opening from the LINE rich menu**, not a standalone login screen.

## Bottom navigation (5 tabs — use these exact labels)
`หน้าหลัก` (/dashboard) · `ส่งข้อมูล` (/submit) · `สถานะ` (/status) · `อันดับ` (/leaderboard) · `เพิ่มเติม` (More).
(The deck must NOT use `รายงาน / แจ้งเตือน / โปรไฟล์` — that nav is wrong.)

## Top bar
Blue **"N"** logo (`#1a56db`), dark-mode toggle, shield (admin), search, a notifications **bell with a
red dot** (placeholder only — see below), and a folder icon.

## Screens that EXIST
- **/dashboard** — greeting `สวัสดี {name}`; **4 KPI cards**: `โครงการของฉัน`, `ส่งครบเดือนนี้` (x/y),
  `อันดับของฉัน` (#rank + คะแนน), `เหลือเวลาส่ง`; then `โครงการของฉัน` project cards (StatusBadge,
  `ส่งแล้ว x/y พื้นที่`, buttons `ส่งข้อมูล` / `สถานะ/จัดการ`) and `+ ลงทะเบียนเพิ่ม`.
- **/submit** — project picker: `เลือกโครงการเพื่อกรอกและส่งข้อมูลรายเดือน`; cards show `ส่งแล้ว x/y พื้นที่`.
- **/submit/[id]** — per-project entry. Header: project name · `x พื้นที่` · `รอบ {เดือน ปี พ.ศ.}` ·
  `เหลือ/เลยกำหนด N วัน`; a progress bar `ส่งแล้ว x/y พื้นที่`. Then a **3-way switcher**:
  `ทีละพื้นที่` (per-location form), `ตาราง` (spreadsheet grid), `Excel` (offline download/upload).
  The per-location **form is numeric**: `ก่อน/หลัง` indicator pairs (AAI dimensions) + note textareas +
  an auto `สถานะการดำเนินงาน` + `บันทึกร่าง` / `ส่งข้อมูลพื้นที่นี้`. A submitted location is **LOCKED**;
  to change it you press **`ขอแก้ไขข้อมูล`** (an admin approves). **There is no PDF/JPG attachment** — the
  only "file" feature is **Excel import/export** (`ดาวน์โหลดแบบฟอร์ม` / `อัปโหลดไฟล์ที่กรอกแล้ว`).
- **/status** — `สถานะการส่งข้อมูล`; project cards with StatusBadge + progress + `ส่งข้อมูล` / `สถานะ/จัดการ`.
- **/leaderboard** — `อันดับการส่งข้อมูล`; tabs `เดือนนี้ / ย้อนหลัง / ส่งเร็วที่สุด`; a **top-3 podium** then a
  ranked list (the viewer is tagged `คุณ`). Tagline: `ส่งก่อน ครบ และเร็ว = คะแนนสูงสุด`.
- **/profile** — `โปรไฟล์ของฉัน`; contact form (`ชื่อ-นามสกุล`, `เบอร์โทร`, `หน่วยงาน`, `อีเมล`), a
  `เชื่อมต่อ LINE` badge, `บันทึกโปรไฟล์`, and `ประวัติการใช้งาน`. (No explicit logout button; the
  theme toggle lives in the top bar.)
- Also: `/register`, `/chat` (in-app bot), `/help` + `/help/manual`.

## Screens that DO NOT exist
- **No standalone LINE-login page** (see above).
- **No in-app Notifications page.** The bell is a placeholder. Notifications reach users as **LINE push
  messages from the bot** (approval / rejection / monthly-deadline reminders). Depict "การแจ้งเตือน" as a
  **LINE chat message**, not an app screen.

## Admin side (monitor portal — NOT the staff app)
The bot has an **admin-only monitor portal** (`/m/...`, password-gated), separate from the member app —
designs for project staff must NOT include these. It covers monthly-reminder controls, project/contact
management, edit-request + หัวหน้าโครงการ approvals, and **field-visit announcements**:
- **แจ้งการลงพื้นที่ตรวจสอบ / นัดหมาย** (`/m/visits`): an admin composes a field-visit event (หัวข้อ · จังหวัดหลัก ·
  วัน-เวลา · สถานที่ · รายละเอียด). The province picker is **data-driven from every project's locations**
  (shows a project count per จังหวัด and auto-includes new provinces) and **auto-suggests the host
  province's bordering provinces** (editable). On send, the bot pushes a **LINE Flex invite with ✅ จะเข้าร่วม /
  ❌ ไม่สะดวก RSVP buttons** to the LINE contacts of every project located in the selected provinces, and
  tallies the responses for the admin. This is a **LINE push + admin dashboard** feature — there is **no
  member-facing screen** for it.

## Status vocabulary (StatusBadge)
`ส่งแล้ว` · `อนุมัติแล้ว` · `ฉบับร่าง` · `ยังไม่ส่ง` · `ตีกลับ`.

## Brand & contact
- App icon: blue rounded-square white **"N"** (`#1a56db`). Accent: mint `#00d4a4`. Primary: black pill.
- Contact: **LINE add-friend** (placeholder — set your own OA ID) · office hours **จ–ศ 08.30–16.30 น.**
  (an email contact also exists but the คู่มือ contact slide shows LINE + hours only).
- Demo identity used for screenshots: `ศิริพร ใจดี`.
