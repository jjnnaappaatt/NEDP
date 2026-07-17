-- AAI 0–100 bounds (WS2b) — defense-in-depth at the DB layer to match the app-layer guard in
-- submitPersonAssessment(). Each AAI domain (aai_d1..aai_d4) and aai_overall must be NULL (= not scored)
-- or in [0,100]. numeric(5,2) already caps magnitude, but not the semantic 0–100 range.
--
-- Idempotent: each CHECK is added only if a constraint of that name is not already present. Constraints are
-- added NOT VALID so this never fails on any pre-existing bad rows — new/updated rows are still enforced.
-- (Pilot data in person_assessments is ~empty, so an eventual `VALIDATE CONSTRAINT` would pass; left out here
-- deliberately per the "don't validate in a way that could fail existing rows" guardrail.)

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chk_pa_aai_d1_range') then
    alter table public.person_assessments
      add constraint chk_pa_aai_d1_range check (aai_d1 is null or aai_d1 between 0 and 100) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_pa_aai_d2_range') then
    alter table public.person_assessments
      add constraint chk_pa_aai_d2_range check (aai_d2 is null or aai_d2 between 0 and 100) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_pa_aai_d3_range') then
    alter table public.person_assessments
      add constraint chk_pa_aai_d3_range check (aai_d3 is null or aai_d3 between 0 and 100) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_pa_aai_d4_range') then
    alter table public.person_assessments
      add constraint chk_pa_aai_d4_range check (aai_d4 is null or aai_d4 between 0 and 100) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_pa_aai_overall_range') then
    alter table public.person_assessments
      add constraint chk_pa_aai_overall_range check (aai_overall is null or aai_overall between 0 and 100) not valid;
  end if;
end $$;
