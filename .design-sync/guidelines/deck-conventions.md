# Deck / คู่มือ conventions (slide presentations built with this system)

Rules for building a Thai user-guide / training **slide deck** (e.g. "NEDP คู่มือการใช้งาน") with the
NEDP design system. Pair with `nedp-app-spec.md` (depict only screens that exist).

## Frame & layout — FILL the page
- 16:9, **1920×1080** (or 1440×810). Every slide must fill its frame **edge-to-edge**. The common
  failure is a two-column slide with the phone on the left, bullets in the middle, and an **empty right
  third + empty bottom** — do not leave that dead zone.
- **Screen-walkthrough slide** = device mockup on the **left (~38–42% width, vertically centered)** +
  explanation on the **right (~52–56%, vertically centered)**. Use the full height. Balance whitespace
  **intentionally** (a faint oversized section number, a brand mark, a thin mint rule), not by leaving a
  blank column.
- **Cover / closing** slides: anchor content to a clear grid; if one side holds a device, give the other
  side real weight (title block, or the contact card), no large vacuum.

## Use REAL screenshots
- Drop the captures from `NEDP_deck_assets/` **inside the phone frame** instead of hand-drawing the UI.
- Phone frame: clean iPhone-style body + real status bar. Don't add fake, sub-24px chrome text.

## Thai typography (never clip marks)
- Line-height **≥1.5** on Thai body, **1.45** on hero headings; `text-wrap: pretty`/`balance`;
  `letter-spacing: normal` on Thai (Latin kickers may track tighter).
- Titles **54–88px**, body **≥24px**. IBM Plex Sans Thai + Inter via the DS font tokens.
- Thai วรรณยุกต์ (above) and สระล่าง ◌ุ ◌ู (below) extend past the base glyph — **never** put
  `overflow:hidden`/truncate on tight Thai lines, or the marks get clipped.

## Color & components
- White slides, with an occasional **near-black** slide for rhythm. Mint `#00d4a4` reserved for
  eyebrows/accents; ink `#0a0a0a`; status colors from the DS `*-bg/*-fg` pairs.
- Keep `StatusBadge` and `Avatar` as **live NEDP components** so Thai status labels render correctly.

## Accuracy checklist (before finalizing)
1. Bottom nav reads `หน้าหลัก · ส่งข้อมูล · สถานะ · อันดับ · เพิ่มเติม`.
2. No standalone login screen; "เข้าใช้งาน" = open from the LINE rich menu.
3. No in-app notifications page; "การแจ้งเตือน" = a LINE chat message.
4. Submit shows the real 3-way entry (ทีละพื้นที่ / ตาราง / Excel); "ไฟล์" = Excel import/export only.
5. Includes an **อันดับ / Leaderboard** slide.
6. Contact slide = LINE add-friend + office hours only.
7. Every slide fills the frame; no clipped Thai marks.
