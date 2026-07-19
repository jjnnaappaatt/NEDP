-- Launch-audit fix: stop MISSING data from masquerading as a real score in the derived AAI.
--
-- (1) Occupation-NULL → employment NULL (not 0). Today a blank occupation is scored as
--     unemployed=0, and because `employment` is always non-null, D1 is never renormalized out —
--     so a not-collected occupation silently costs up to 30 Overall points AND falsely satisfies
--     the completeness gate. Fix: emit employment = NULL when occupation is NULL, so D1 is
--     renormalized out like every other missing domain; only a genuine non-employed code scores 0.
--
-- (2) Life-expectancy raw-units guard (INTERIM). life_expectancy_55 / healthy_life_expectancy_55
--     were emitted as raw YEAR counts (~24) and averaged into D4 at 0.20+0.20 against 0-100
--     indicators — silently corrupting D4/Overall the instant geo_tambon.life_exp_55_est is loaded.
--     It is dormant today (0/7,436 tambons populated). Until a committee-agreed 0-100 normalization
--     anchor is defined, emit NULL so the indicator renormalizes out (identical to today's behaviour,
--     but no longer a landmine). RE-ENABLE by replacing the NULLs with `round(100*normalize(le),2)`.
--
-- Only aai_derive_indicators changes; aai_score_indicators / fn_score_person_assessment are untouched.
-- Re-scoring below is a no-op on current prod (0 derived rows; the 2 existing rows are scoring_mode='manual').

create or replace function public.aai_derive_indicators(raw jsonb, p_age integer, p_education integer, p_occupation integer, p_tambon character)
 returns jsonb
 language plpgsql
 stable
 set search_path to 'public', 'extensions'
as $function$
declare
  q2 numeric := nullif(raw->>'aai_q2','')::numeric;
  q3 numeric := nullif(raw->>'aai_q3','')::numeric;
  q4 numeric := nullif(raw->>'aai_q4','')::numeric;
  q5 numeric := nullif(raw->>'aai_q5','')::numeric;
  q6 numeric := nullif(raw->>'aai_q6','')::numeric;
  q7 numeric := nullif(raw->>'aai_q7','')::numeric;
  barthel numeric := nullif(raw->>'barthel','')::numeric;
  env  numeric := nullif(raw->>'environment','')::numeric;
  tgds numeric := nullif(raw->>'tgds','')::numeric;
  cc   numeric := nullif(raw->>'care_children_q','')::numeric;
  ce   numeric := nullif(raw->>'care_elderly_q','')::numeric;
  inc  numeric := nullif(raw->>'income_adequacy','')::numeric;
  pov  numeric := nullif(raw->>'poverty_risk','')::numeric;
  matd numeric := nullif(raw->>'material_deprivation','')::numeric;
  -- FIX (1): a MISSING occupation is unknown, not unemployed → NULL so D1 renormalizes out.
  emp  numeric := case when p_occupation is null then null
                       when p_occupation in (1,2,3) then 100 else 0 end;
  le numeric; hale numeric;
begin
  select life_exp_55_est, healthy_life_exp_55_est into le, hale
    from public.geo_tambon where tambon_code = p_tambon;
  if le is not null and hale is not null and hale > le then hale := le; end if;
  return jsonb_build_object(
    'employment', emp,
    'emp_55_59', case when p_age between 55 and 59 then emp end,
    'emp_60_64', case when p_age between 60 and 64 then emp end,
    'emp_65_69', case when p_age between 65 and 69 then emp end,
    'emp_70_74', case when p_age between 70 and 74 then emp end,
    'voluntary',     case when q4 is not null then round(100*q4/4,2) end,
    'political',     case when q5 is not null then round(100*q5/4,2) end,
    'care_children', case when cc is not null then round(100*least(cc,1),2) end,
    'care_elderly',  case when ce is not null then round(100*least(ce,1),2) end,
    'physical_exercise', case when q2 is not null then round(100*q2/4,2) end,
    'health_access',     case when q7 is not null then round(100*q7/4,2) end,
    'independent_living', case when barthel is not null then least(barthel,100)
                               when q3 is not null then round(100*q3/3.0,2) else null end,
    'relative_income',         case when inc  is not null then round(100*least(inc,4)/4,2) end,
    'no_poverty_risk',         case when pov  is not null then round(100*(1 - least(pov,1)),2) end,
    'no_material_deprivation', case when matd is not null then round(100*(1 - least(matd,4)/4),2) end,
    'physical_safety',   case when env is not null then round(100*(1 - env/9.0),2) end,
    'lifelong_learning', case when q6 is not null then round(100*q6/3.0,2) end,
    -- FIX (2): raw life-expectancy years distort a 0-100 mean. Emit NULL until a 0-100 anchor is agreed.
    'life_expectancy_55',         null,
    'healthy_life_expectancy_55', null,
    'mental_wellbeing',  case when tgds is not null then round(100*(1 - tgds/15.0),2) end,
    'ict_use',           case when q6 is not null then round(100*q6/3.0,2) end,
    'social_connectedness', case when q4 is not null and q5 is not null then round(100*((q4+q5)/8.0),2) end,
    'educational_attainment', case when p_education is not null then least(round(100*p_education/3.0,2),100) end
  );
end$function$;

-- Re-score existing DERIVED rows (fires the BEFORE trigger to re-derive from raw_answers).
-- No-op on current prod (no scoring_mode <> 'manual' rows exist).
update public.person_assessments set updated_at = now() where scoring_mode is distinct from 'manual';
