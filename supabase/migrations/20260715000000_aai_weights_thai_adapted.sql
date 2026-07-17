-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- AAI domain weights → Thai-Adapted Version (2567)
-- Overall AAI combination changes from 35/35/10/20 to 30/15/30/25:
--   D1 (employment/income) 0.35 → 0.30
--   D2 (participation)     0.35 → 0.15
--   D3 (health & security) 0.10 → 0.30
--   D4 (environment)       0.20 → 0.25
-- Domain scores D1–D4 (their inner-indicator weights + the 22-indicator structure) are UNCHANGED;
-- only how the four domains combine into the overall score changes. This mirrors the interactive
-- AAI calculator shown in the manual (public/manual/aai-dashboard.html) and PersonDomainForm.tsx.
-- Reversible: re-run 20260712000000's definitions to restore 35/35/10/20.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

-- ── 1. Derived-path overall weights (aai_score_indicators) ──────────────────────────────────────────
create or replace function public.aai_score_indicators(ind jsonb)
 returns jsonb language plpgsql immutable set search_path to 'public'
as $function$
declare d1 numeric; d2 numeric; d3 numeric; d4 numeric; ov numeric;
begin
  d1 := coalesce((ind->>'employment')::numeric,
                 (ind->>'emp_55_59')::numeric,(ind->>'emp_60_64')::numeric,
                 (ind->>'emp_65_69')::numeric,(ind->>'emp_70_74')::numeric);
  select avg(x) into d2 from (values
    ((ind->>'voluntary')::numeric),((ind->>'care_children')::numeric),
    ((ind->>'care_elderly')::numeric),((ind->>'political')::numeric)) t(x);
  select sum(w*x)/nullif(sum(w) filter (where x is not null),0) into d3 from (values
    (0.10,(ind->>'physical_exercise')::numeric),(0.10,(ind->>'health_access')::numeric),
    (0.10,(ind->>'independent_living')::numeric),(0.15,(ind->>'relative_income')::numeric),
    (0.15,(ind->>'no_poverty_risk')::numeric),(0.15,(ind->>'no_material_deprivation')::numeric),
    (0.10,(ind->>'physical_safety')::numeric),(0.15,(ind->>'lifelong_learning')::numeric)) t(w,x);
  select sum(w*x)/nullif(sum(w) filter (where x is not null),0) into d4 from (values
    (0.20,(ind->>'life_expectancy_55')::numeric),(0.20,(ind->>'healthy_life_expectancy_55')::numeric),
    (0.20,(ind->>'mental_wellbeing')::numeric),(0.10,(ind->>'ict_use')::numeric),
    (0.15,(ind->>'social_connectedness')::numeric),(0.15,(ind->>'educational_attainment')::numeric)) t(w,x);
  -- Thai-Adapted overall weights (was 0.35/0.35/0.10/0.20):
  select sum(w*x)/nullif(sum(w) filter (where x is not null),0) into ov from (values
    (0.30,d1),(0.15,d2),(0.30,d3),(0.25,d4)) t(w,x);
  return jsonb_build_object('d1',round(d1,2),'d2',round(d2,2),'d3',round(d3,2),
                            'd4',round(d4,2),'overall',round(ov,2));
end$function$;

-- ── 2. Trigger: manual-branch overall weights + version bumps (rest unchanged) ──────────────────────
create or replace function public.fn_score_person_assessment()
 returns trigger language plpgsql set search_path to 'public', 'extensions'
as $function$
declare v_age int; v_edu int; v_occ int; v_proj uuid; v_tambon char(6); ind jsonb; sc jsonb;
        w1 numeric; w2 numeric; w3 numeric; w4 numeric; wsum numeric;
begin
  select pr.project_id, pr.tambon_code, pr.education_level, pr.occupation_code
    into v_proj, v_tambon, v_edu, v_occ
    from public.persons pr where pr.id = NEW.person_id;
  NEW.project_id  := coalesce(NEW.project_id,  v_proj);
  NEW.tambon_code := coalesce(NEW.tambon_code, v_tambon);
  if NEW.scoring_mode = 'manual' then
    w1 := case when NEW.aai_d1 is not null then 0.30 else 0 end;
    w2 := case when NEW.aai_d2 is not null then 0.15 else 0 end;
    w3 := case when NEW.aai_d3 is not null then 0.30 else 0 end;
    w4 := case when NEW.aai_d4 is not null then 0.25 else 0 end;
    wsum := w1 + w2 + w3 + w4;
    NEW.aai_overall := case when wsum > 0 then round(
        (w1*coalesce(NEW.aai_d1,0) + w2*coalesce(NEW.aai_d2,0)
       + w3*coalesce(NEW.aai_d3,0) + w4*coalesce(NEW.aai_d4,0)) / wsum, 2) end;
    NEW.scoring_version := 'manual-2026-08';
    NEW.updated_at := now();
    return NEW;
  end if;
  v_age := nullif(NEW.raw_answers->>'age','')::int;
  v_edu := coalesce(nullif(NEW.raw_answers->>'education','')::int,  v_edu);
  v_occ := coalesce(nullif(NEW.raw_answers->>'occupation','')::int, v_occ);
  ind := public.aai_derive_indicators(NEW.raw_answers, v_age, v_edu, v_occ, NEW.tambon_code);
  sc  := public.aai_score_indicators(ind);
  NEW.emp_55_59:=(ind->>'emp_55_59')::numeric; NEW.emp_60_64:=(ind->>'emp_60_64')::numeric;
  NEW.emp_65_69:=(ind->>'emp_65_69')::numeric; NEW.emp_70_74:=(ind->>'emp_70_74')::numeric;
  NEW.voluntary:=(ind->>'voluntary')::numeric; NEW.care_children:=(ind->>'care_children')::numeric;
  NEW.care_elderly:=(ind->>'care_elderly')::numeric; NEW.political:=(ind->>'political')::numeric;
  NEW.physical_exercise:=(ind->>'physical_exercise')::numeric; NEW.health_access:=(ind->>'health_access')::numeric;
  NEW.independent_living:=(ind->>'independent_living')::numeric; NEW.relative_income:=(ind->>'relative_income')::numeric;
  NEW.no_poverty_risk:=(ind->>'no_poverty_risk')::numeric; NEW.no_material_deprivation:=(ind->>'no_material_deprivation')::numeric;
  NEW.physical_safety:=(ind->>'physical_safety')::numeric; NEW.lifelong_learning:=(ind->>'lifelong_learning')::numeric;
  NEW.life_expectancy_55:=(ind->>'life_expectancy_55')::numeric; NEW.healthy_life_expectancy_55:=(ind->>'healthy_life_expectancy_55')::numeric;
  NEW.mental_wellbeing:=(ind->>'mental_wellbeing')::numeric; NEW.ict_use:=(ind->>'ict_use')::numeric;
  NEW.social_connectedness:=(ind->>'social_connectedness')::numeric; NEW.educational_attainment:=(ind->>'educational_attainment')::numeric;
  NEW.aai_d1:=(sc->>'d1')::numeric; NEW.aai_d2:=(sc->>'d2')::numeric; NEW.aai_d3:=(sc->>'d3')::numeric;
  NEW.aai_d4:=(sc->>'d4')::numeric; NEW.aai_overall:=(sc->>'overall')::numeric;
  NEW.scoring_version := 'prov-2026-08';   -- Thai-Adapted overall weights 30/15/30/25
  NEW.tool_frail:=nullif(NEW.raw_answers->>'frail','')::int;  NEW.tool_mna:=nullif(NEW.raw_answers->>'mna','')::numeric;
  NEW.tool_tgds:=nullif(NEW.raw_answers->>'tgds','')::int;    NEW.tool_minicog:=nullif(NEW.raw_answers->>'minicog','')::int;
  NEW.tool_barthel:=nullif(NEW.raw_answers->>'barthel','')::int; NEW.tool_fes_i:=nullif(NEW.raw_answers->>'fes_i','')::int;
  NEW.tool_l_iadl:=nullif(NEW.raw_answers->>'l_iadl','')::int;   NEW.tool_environment:=nullif(NEW.raw_answers->>'environment','')::int;
  NEW.tool_eq_vas:=nullif(NEW.raw_answers->>'eq_vas','')::int;
  NEW.flag_mini_cog := (NEW.tool_minicog is not null and NEW.tool_minicog <= 2);
  NEW.flag_mna      := (NEW.tool_mna     is not null and NEW.tool_mna     <= 11);
  NEW.flag_tgds     := (NEW.tool_tgds    is not null and NEW.tool_tgds    >= 7);
  NEW.flag_frail    := (NEW.tool_frail   is not null and NEW.tool_frail   >= 3);
  NEW.updated_at := now();
  return NEW;
end$function$;

-- ── 3. Re-score existing rows: recompute aai_overall from stored D1–D4 with the new weights ──────────
-- D1–D4 are unchanged, so only the overall combination is recomputed (renormalized over filled domains).
update public.person_assessments pa set
  aai_overall = sub.ov,
  scoring_version = case when pa.scoring_mode = 'manual' then 'manual-2026-08' else 'prov-2026-08' end,
  updated_at = now()
from (
  select id,
    round(
      ( (case when aai_d1 is not null then 0.30 else 0 end) * coalesce(aai_d1,0)
      + (case when aai_d2 is not null then 0.15 else 0 end) * coalesce(aai_d2,0)
      + (case when aai_d3 is not null then 0.30 else 0 end) * coalesce(aai_d3,0)
      + (case when aai_d4 is not null then 0.25 else 0 end) * coalesce(aai_d4,0) )
      / nullif(
          (case when aai_d1 is not null then 0.30 else 0 end)
        + (case when aai_d2 is not null then 0.15 else 0 end)
        + (case when aai_d3 is not null then 0.30 else 0 end)
        + (case when aai_d4 is not null then 0.25 else 0 end), 0), 2) as ov
  from public.person_assessments
) sub
where pa.id = sub.id;
