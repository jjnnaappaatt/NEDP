## NEDP UI — how to build with this system

A Thai-first "civic" design system (Mintlify-inspired): white canvas, hairline-flat cards, a
**black-pill** primary action, and a signature **mint** accent (`#00d4a4`) reserved for accent
moments. Components are imported from `window.NEDP.*` and styled with Tailwind utility classes that
are wired to CSS-variable tokens.

### Setup
No provider or theme wrapper is needed — the tokens and utilities ship in `styles.css` (loaded for
every design), so components are styled out of the box. To render the **dark** theme, put `class="dark"`
on a root ancestor (`<html class="dark">`): every token flips (near-black canvas, white-pill primary,
mint unchanged) with no per-component change. Body font is Inter (Latin) + IBM Plex Sans Thai; the app
is Thai-first, so prefer generous `line-height` on Thai text (the tokens already do).

### Styling idiom — Tailwind utilities bound to tokens (use THESE names, don't invent hex)
- **Surfaces:** `bg-page` (app canvas), `bg-surface` (cards), `bg-surface-soft` (chips/skeletons). The
  `.card` class is the canonical card (white + 1px `border-border` + `rounded-card` 12px + `shadow-card`).
- **Text:** `text-ink` (primary), `text-ink-soft`, `text-ink-muted`, `text-ink-accent` (links).
- **Actions:** primary = `bg-hero text-[var(--on-primary)]` (black pill / white-on-dark); accent =
  `bg-accent text-[var(--on-accent)]` (mint, black text); use `rounded-full` for buttons/pills.
- **Status tones (bg + fg pairs):** `bg-success-bg text-success-fg`, `bg-warning-bg text-warning-fg`,
  `bg-danger-bg text-danger-fg`; soft mint tint = `bg-accent-soft`. Ranks: `text-gold/silver/bronze`.
- **Borders / radius / type:** `border-border` (+ `border-border-accent` for focus), `rounded-card`,
  `font-display` (headings), `font-sans` (body).

### Where the truth lives
Read `styles.css` (every token + utility) before styling, and each component's `<Name>.d.ts` (its props)
and `<Name>.prompt.md` (usage) before composing it.

### Components — foundational atoms
`Button` (variant: primary | accent | secondary | ghost), `Badge` + `StatusBadge` (submission tones),
`Card`, `Avatar` (emoji-on-disc, or a LINE `pictureUrl` photo), `IconBadge` (tinted icon disc), `Sheet`
(bottom-sheet on mobile / centered dialog on desktop), `PageSkeleton` (route loading state).

### Components — AAI dashboard & data-entry building blocks
Compose these for the individual Active-Ageing-Index views (all render standalone with mock props; the
full `/dashboard` + data-entry screens compose them but fetch Supabase data, which is NOT in this DS):
`StatCard` (KPI tile — an `IconBadge` + big number + label + optional sub), `BarTriple` (three-time-point
score bars เริ่มต้น→เดือนที่แล้ว→ล่าสุด with an automatic Δ badge, 0–100), `AreaCard` (per-area drill card —
AAI รวม bars, a "ดีขึ้น ≥10%" note, a ดูรายมิติ toggle revealing the 4 มิติ, and a drill button; compare-mode
select), `AaiComparePanel` (side-by-side compare of ≤5 areas by domain, with remove/clear), `ProjectMultiSelect`
(searchable project-scope multi-select with all/none + ผู้รับผิดชอบ subtitles), `SummaryBox` (compact
label + big-value tile; `highlight` for the accent one), `DimensionHighlightCards` (a จุดเด่น/ควรพัฒนา
per-มิติ takeaway pair — green strongest + amber weakest), `DomainScoreInput` (one labeled 0–100 AAI
domain-score entry field).

### Idiomatic snippet
```tsx
import { Card, Button, StatusBadge } from "window.NEDP"; // (these resolve from window.NEDP at runtime)

<Card className="max-w-sm">
  <div className="flex items-center justify-between gap-2">
    <div className="font-display font-semibold text-ink">โครงการประเมินความเสี่ยงการหกล้ม</div>
    <StatusBadge status="submitted" />
  </div>
  <p className="mt-1 text-sm text-ink-soft">รอบเดือน มิถุนายน 2569 · 4 พื้นที่</p>
  <div className="mt-4 flex gap-2">
    <Button>ส่งรายงาน</Button>
    <Button variant="secondary">ดูรายละเอียด</Button>
  </div>
</Card>
```

### Building a real SCREEN or a DECK with this system — read the product spec first
These components are the parts; the **real app** they compose into is documented in `guidelines/`:
- **`guidelines/nedp-app-spec.md`** — the actual NEDP screens & IA (the 5-tab nav, what `/dashboard`,
  `/submit`, `/status`, `/leaderboard`, `/profile` really contain) and, crucially, what does **not**
  exist (no standalone login screen, no in-app notifications page). Real screenshots live in
  `NEDP_deck_assets/`. Read this before depicting any screen so you don't invent one.
- **`guidelines/deck-conventions.md`** — slide rules for a Thai user-guide deck: fill the 16:9 frame
  (no empty right third), Thai line-heights that don't clip tone-marks, real screenshots in the phone
  frame, and the real brand/contact values.
