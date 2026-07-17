# Supabase migrations

## `20260629000000_individual_aai_platform.sql`
The complete DDL for the **individual-level AAI by tambon (รายตำบล)** feature — captured from prod
(`<prod-ref>`, migrations `20260629085444…20260629144108` + the Vault secret). Creates:
`geo_tambon`, `persons`, `restricted.person_names`, `restricted.reidentification_log`,
`person_assessments` (+ audit), the scoring functions/trigger, `enroll_person`/`assess_person`/
`reidentify_person`/`recompute_person_assessments`, the `tambon_aai_monthly(+_pivot)` rollup, RLS + grants,
and the pg_cron refresh. Verified complete against the live catalog (6 tables · 1 matview · 1 view · 10 funcs).

**Apply order (fresh DB):** `../schema.sql` (Phase-2 baseline) → this file. It depends on the baseline tables
(`projects`, `project_locations`, `project_account_registrations`).

## `20260701000000_individual_portal_snapshots.sql`
The **general individual-entry portal** layer on top of the platform above. Adds `scoring_mode`
('manual' = staff type D1–D4, Overall auto-computed with renormalized weights / 'derived' = the original
22-indicator path, unchanged); switches the assessment identity from pre/post `round` to **one snapshot
per `(person_id, year_month)`** with `person_assessment_points` deriving baseline (first) / latest / +10%;
`tambon_osm_counts` (+ `upsert_osm_count`); project-scoped, audit-logged name search
(`search_persons_by_name` / `get_person_name` + `restricted.name_lookup_log`, **service-role only**);
`assess_person_manual`; `approve_person_assessment`; the multi-level dashboard rollup
`aai_rollup_snapshots(level, latest_month, prev_month, project_ids[])`; and a redefinition of
`tambon_aai_monthly` (+ pivot) to **baseline-vs-latest** while preserving the pivot's public column names
(so `/exec/tambon` + `getTambonDimensionSummary` keep working — the data layer just drops the now-unused
`year_month` filter). The `reidentify_person` clinical referral gate is untouched. Verified end-to-end on
the live (empty) DB; advisors show no new issues beyond the established gated-RPC pattern.

A follow-up migration `portal_search_persons_add_tambon_filter` generalizes `search_persons_by_name` with
an optional tambon filter (one function serves both the tambon-hub list and the project-wide search). The
final state is reflected inline in `20260701000000_*` above (the consolidated file is the canonical rebuild).

## Data steps (NOT in the migration — run after applying)
1. **Seed `geo_tambon`** (7,436 TIS-1099 tambons): `node ../scripts/geo/seed_geo_tambon.mjs <geo_tambon_seed.json>`
   (source: thailand-geography-data; the seed JSON lives in `../scripts/geo/`).
2. **Backfill `project_locations.tambon_code`** by matching the free-text province/amphoe/tambon to
   `geo_tambon.geo_join_key` (alias-normalized; exact-tambon + unique-in-province). 288/328 resolve;
   33 are province-only placeholders; **11 are genuine source errors** (wrong province, amphoe-used-as-tambon,
   เทศบาล/local names) left for the project owners.
3. The name-encryption key is generated **server-side into Supabase Vault** by the migration's `DO` block —
   it is never stored in the repo.

## ⚠ Known gap (pre-existing, not from this feature)
`../schema.sql` is **stale** — it reflects an early Phase-2 snapshot and is missing the ~21 monitor/web
migrations applied to Supabase between 2026-06-26 and 2026-06-28 (`bridge_*`, `web_*`, `round7…round21`,
`project_head`, etc.). The repo did not use a migrations workflow before this file. For full reproducibility,
run `supabase db pull` (needs the CLI linked with the DB password) to capture those into `migrations/` too,
or refresh `schema.sql` from the live DB.
