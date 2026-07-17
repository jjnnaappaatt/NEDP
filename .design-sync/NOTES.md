# design-sync notes — aai_next_dashboard

This repo is a **Next.js app, not a component library**. We sync **16 self-contained presentational
components**: the 8 atoms under `components/ui/` (incl. `StatusBadge`) **plus 8 AAI dashboard / data-input
building blocks** — `StatCard`, `BarTriple`, `SummaryBox`, `DimensionHighlightCards`, `DomainScoreInput`,
`AreaCard`, `AaiComparePanel`, `ProjectMultiSelect` (from `components/portal/` + `components/dashboard/`).
`AreaCard` (per-area drill card) and `DomainScoreInput` (0–100 score field) were **extracted** from
`AaiDashboard` / `PersonDomainForm` into standalone files so they render in isolation. The full **screens**
(`AaiDashboard`, `PersonSheet`, `PersonDomainForm`, …) stay excluded — they fetch from the server-only data
layer / Supabase and won't render standalone. `cfg.srcDir` still scopes auto-discovery to `components/ui`;
`componentSrcMap` explicitly pins all 16 (incl. the portal/dashboard paths that lie outside `srcDir`). The 8
new blocks are browser-safe (their only data-layer imports are `import type`, erased at build).

## Fresh-clone / re-sync setup (do these BEFORE running the converter)

1. `npm ci` (restore the app's node_modules — the bundle resolves react/clsx/tabler from it).
2. **Self-symlink** (gitignored, machine-local) so `PKG_DIR` resolves to the repo in synth-entry mode:
   `ln -sfn "$(pwd)" node_modules/aai-next-dashboard`
3. **Regenerate the compiled CSS** (gitignored cache; there's no shipped stylesheet — `cssEntry`
   points at this Tailwind build of `app/globals.css`):
   `npx tailwindcss -i app/globals.css -o .design-sync/.cache/ds-compiled.css --content "./{components,app,lib,.design-sync/previews}/**/*.{ts,tsx}"`
   Re-run it whenever `globals.css` tokens change **or** a new preview uses a utility class not
   already in the app, so the class ships in the bundle CSS.
4. Converter deps + a browser live in `.ds-sync/` (run its `npm i esbuild ts-morph @types/react playwright`
   + `npx playwright install chromium` once). On macOS chromium caches to `~/Library/Caches/ms-playwright`.

Then run `package-build.mjs` with **no `--entry`** (triggers synth-entry) and `--node-modules ./node_modules`.

## Component-specific

- **Sheet** renders `position: fixed inset-0`. Its preview wraps it in a `transform: translateZ(0)`
  container so the fixed overlay resolves to the card (else it collapses to 0px / crops). `cfg.overrides.Sheet`
  sets `viewport: 680x500` so the `sm:` centered-dialog layout applies. (This resolved the `[RENDER_THIN]` warn.)
- **Avatar** "Photo" preview uses an inline data-URI SVG (stable, no external dep) to demonstrate the
  `pictureUrl` path; the "Emoji" cell shows the default deterministic-emoji-on-colour-disc look.
- **IconBadge** preview passes a tiny inline SVG glyph (the app passes `@tabler/icons-react` icons the same way).
- **StatCard** composes the synced `IconBadge`; its preview passes real `@tabler/icons-react` icons.
- **AaiComparePanel** is wide (side-by-side columns) → `cfg.overrides.AaiComparePanel` sets `viewport: 800x520`.
  Its preview builds mock `AaiSnapshotRow[]` locally (the type isn't imported into the preview).
- **ProjectMultiSelect** is a stateful dropdown; the static preview captures the **collapsed** trigger
  (selected count + all/none). Opening the menu needs interaction, not shown.
- **AreaCard** / **DomainScoreInput** were extracted from `AaiDashboard` / `PersonDomainForm`; their previews
  pass mock rows / a no-op `onChange`.

## Known render warns
(none — Sheet `[RENDER_THIN]` resolved via the transform wrapper)

## tokens
`tokens: 90 defined, 77 referenced (3 missing, below threshold)` — non-blocking. The 3 are runtime
font vars (`--font-inter` / `--font-thai`, injected by Next/font) referenced by `--font-display`/`--font-body`;
the bundle falls back to the family stack. Not worth chasing.

## Re-sync risks (watch-list)
- The **self-symlink** and **compiled CSS** are gitignored/machine-local — both must be recreated on a
  fresh clone (steps 2–3) or the build fails (`[NO_DIST]` / `[CSS_*]`).
- `cssEntry` is a **generated artifact**, not source — if it's stale (globals.css changed, not regenerated)
  the cards render with old tokens.
- Scope = the 8 `components/ui` atoms (auto-discovered) + 8 `componentSrcMap`-pinned portal/dashboard
  building blocks. Only add MORE components if they're prop-driven and browser-safe (no server-only/data
  imports beyond `import type`). Full app screens must NOT be added (they won't render standalone).
- Build assumed: Tailwind v3.4, React 19, Node with the app's node_modules present.

## Re-sync log — 2026-06-29: product spec + deck guidelines (docs-only, no rebuild)
Added `guidelines/nedp-app-spec.md` (the real app screens/IA — so designs don't invent a login screen
or notifications page) and `guidelines/deck-conventions.md` (Thai slide-deck rules), and appended a
pointer to both from `conventions.md` → regenerated `ds-bundle/README.md` (header + existing auto-tail).
Pushed README.md + guidelines/** to project `3c7c8d77-…` via finalize_plan→write_files (no component or
bundle change, so `_ds_sync.json` was NOT regenerated — its component hashes are still valid; only the
README/guidelines are newer than the anchor, which is fine since those aren't render-graded). A future
full re-sync regenerates the anchor and rebuilds README from the updated `conventions.md`. Companion
real screenshots saved to repo-root `NEDP_deck_assets/` (not uploaded — attached directly in the deck
chat). Motivation: the deck agent had the components but no product spec, so it invented screens.

## Re-sync log — 2026-06-29 (b): admin field-visit announcements
Added an "Admin side (monitor portal — NOT the staff app)" section to `guidelines/nedp-app-spec.md`
documenting the bot's `/m/visits` field-visit announcements (province-targeted LINE Flex invite + RSVP),
flagged admin-only so member designs don't include it. Pushed `guidelines/**` to project `3c7c8d77-…`
(docs-only; anchor unchanged).

## Re-sync log — 2026-07-02: scope expansion (+8 dashboard/data-input blocks) — DONE ✅
Scope grew from 8 atoms to **16** (uploaded to project `3c7c8d77-…`, all 16 graded `good`, validate clean).
Added to `componentSrcMap`: `StatCard`, `BarTriple`, `SummaryBox`, `DimensionHighlightCards`, `DomainScoreInput`,
`AreaCard`, `AaiComparePanel`, `ProjectMultiSelect`, each with a `previews/<Name>.tsx` + an `AaiComparePanel`
`{viewport:800x520}` override. Extracted `AreaCard` (from `AaiDashboard`) + `DomainScoreInput` (from
`PersonDomainForm`) into standalone files — behavior-preserving (tsc + build green, deployed). Regenerated the
compiled CSS; extended `conventions.md` §Components with the new blocks.

**CRITICAL LEARNING — synth-entry mode ignores out-of-`srcDir` `componentSrcMap` pins for the BUNDLE.**
This repo has no `dist` → `source-kit.mjs` synthesizes the bundle entry by walking `cfg.srcDir` (`components/ui`)
ONLY. `componentSrcMap` adds the 8 new components to the `.d.ts`/preview list (so `[DTS] 16/16`), but their code
never reached `window.NEDP` → `[BUNDLE_EXPORT] 8/16 not a component` + every new preview "Element type is invalid".
**Fix (already in config): `cfg.extraEntries: ["./.design-sync/ds-extra.tsx"]`** — a repo-relative barrel that
`export`s the 8 out-of-srcDir components; `package-build.mjs` merges it onto `window.NEDP` alongside the synth
entry. Keep `ds-extra.tsx` in sync with the portal/dashboard pins whenever a new out-of-`srcDir` component is added.

Note: the default `guidelinesGlob` swept the app's `docs/*.md` into `guidelines/docs/` — uploaded to the
(user-owned) design project as product context. The prior hand-pushed `guidelines/{deck-conventions,nedp-app-spec}.md`
remain (guidelines aren't anchor-tracked, so the diff never deletes them). To scope guidelines to only the
design docs, set `cfg.guidelinesGlob` explicitly.
