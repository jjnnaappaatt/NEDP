-- Individual-data integration for project-head bulk intake → derived AAI.
--
-- (1) Fill the 5 AAI gap indicators + make D1 band-agnostic in the derived scorer (PROVISIONAL;
--     committee-confirmable, stamped scoring_version).
-- (2) Add p_actor to assess_person so service-role bulk writes attribute the assessor (auth.uid() is NULL
--     under service role).
-- (3) Request→approve onboarding gate: projects.individual_integration_enabled + project_integration_requests
--     + web_*_integration RPCs (modeled on 20260705000000_edit_requests.sql).
--
-- APPLY BEFORE the app deploy that references these — assess_person/aai_* are drop/replace (transiently
-- absent within this transaction only).

-- ── 1a. Derived indicator derivation: fill 5 gaps + add band-agnostic `employment` ─────────────────
create or replace function public.aai_derive_indicators(
  raw jsonb, p_age integer, p_education integer, p_occupation integer, p_tambon character
) returns jsonb language plpgsql stable set search_path to 'public', 'extensions'
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
  cc   numeric := nullif(raw->>'care_children_q','')::numeric;      -- NEW: 0/1
  ce   numeric := nullif(raw->>'care_elderly_q','')::numeric;       -- NEW: 0/1
  inc  numeric := nullif(raw->>'income_adequacy','')::numeric;      -- NEW: 0-4 Likert
  pov  numeric := nullif(raw->>'poverty_risk','')::numeric;         -- NEW: 0/1 risk
  matd numeric := nullif(raw->>'material_deprivation','')::numeric; -- NEW: 0-4 count
  emp  numeric := case when p_occupation in (1,2,3) then 100 else 0 end;  -- occ 1/2/3 = employed
  le numeric; hale numeric;
begin
  select life_exp_55_est, healthy_life_exp_55_est into le, hale
    from public.geo_tambon where tambon_code = p_tambon;
  if le is not null and hale is not null and hale > le then hale := le; end if;  -- HALE<=LE (main.py:935)

  return jsonb_build_object(
    -- D1: `employment` is band-agnostic (covers 50-54 / 75+ that the bands miss); band fields kept for reporting
    'employment', emp,
    'emp_55_59', case when p_age between 55 and 59 then emp end,
    'emp_60_64', case when p_age between 60 and 64 then emp end,
    'emp_65_69', case when p_age between 65 and 69 then emp end,
    'emp_70_74', case when p_age between 70 and 74 then emp end,
    -- D2
    'voluntary',     case when q4 is not null then round(100*q4/4,2) end,
    'political',     case when q5 is not null then round(100*q5/4,2) end,
    'care_children', case when cc is not null then round(100*least(cc,1),2) end,      -- NEW (prov)
    'care_elderly',  case when ce is not null then round(100*least(ce,1),2) end,      -- NEW (prov)
    -- D3
    'physical_exercise', case when q2 is not null then round(100*q2/4,2) end,
    'health_access',     case when q7 is not null then round(100*q7/4,2) end,
    'independent_living', case when barthel is not null then least(barthel,100)
                               when q3 is not null then round(100*q3/3.0,2) else null end,
    'relative_income',         case when inc  is not null then round(100*least(inc,4)/4,2) end,        -- NEW (prov)
    'no_poverty_risk',         case when pov  is not null then round(100*(1 - least(pov,1)),2) end,    -- NEW (prov)
    'no_material_deprivation', case when matd is not null then round(100*(1 - least(matd,4)/4),2) end, -- NEW (prov)
    'physical_safety',   case when env is not null then round(100*(1 - env/9.0),2) end,
    'lifelong_learning', case when q6 is not null then round(100*q6/3.0,2) end,
    -- D4
    'life_expectancy_55',         le,
    'healthy_life_expectancy_55', hale,
    'mental_wellbeing',  case when tgds is not null then round(100*(1 - tgds/15.0),2) end,
    'ict_use',           case when q6 is not null then round(100*q6/3.0,2) end,
    'social_connectedness', case when q4 is not null and q5 is not null then round(100*((q4+q5)/8.0),2) end,
    'educational_attainment', case when p_education is not null then least(round(100*p_education/3.0,2),100) end
  );
end$function$;

-- ── 1b. Domain scoring: D1 now sources band-agnostic `employment` first ────────────────────────────
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
  select sum(w*x)/nullif(sum(w) filter (where x is not null),0) into ov from (values
    (0.35,d1),(0.35,d2),(0.10,d3),(0.20,d4)) t(w,x);
  return jsonb_build_object('d1',round(d1,2),'d2',round(d2,2),'d3',round(d3,2),
                            'd4',round(d4,2),'overall',round(ov,2));
end$function$;

-- ── 2. Scoring trigger: bump derived scoring_version (manual branch unchanged) ─────────────────────
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
    w1 := case when NEW.aai_d1 is not null then 0.35 else 0 end;
    w2 := case when NEW.aai_d2 is not null then 0.35 else 0 end;
    w3 := case when NEW.aai_d3 is not null then 0.10 else 0 end;
    w4 := case when NEW.aai_d4 is not null then 0.20 else 0 end;
    wsum := w1 + w2 + w3 + w4;
    NEW.aai_overall := case when wsum > 0 then round(
        (w1*coalesce(NEW.aai_d1,0) + w2*coalesce(NEW.aai_d2,0)
       + w3*coalesce(NEW.aai_d3,0) + w4*coalesce(NEW.aai_d4,0)) / wsum, 2) end;
    NEW.scoring_version := 'manual-2026-07';
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
  NEW.scoring_version := 'prov-2026-07-v2';   -- bumped: +5 gap items, band-agnostic D1
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

-- ── 3. assess_person: add p_actor (service-role bulk intake) ───────────────────────────────────────
drop function if exists public.assess_person(uuid, text, text, jsonb, text);
create or replace function public.assess_person(
  p_person_id uuid, p_round text, p_year_month text, p_raw_answers jsonb,
  p_status text default 'submitted', p_actor uuid default null
) returns jsonb language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
declare v_auth uuid := auth.uid(); v_uid uuid := coalesce(auth.uid(), p_actor);
        v_proj uuid; v_id uuid; v_overall numeric; v_flag boolean;
begin
  select project_id into v_proj from public.persons where id = p_person_id;
  if v_proj is null then raise exception 'person not found'; end if;
  if v_auth is not null and not exists (
      select 1 from public.project_account_registrations r
      where r.project_id = v_proj and r.account_id = v_auth and r.role in ('owner','submitter')
  ) then raise exception 'not authorized to assess for this project'; end if;
  insert into public.person_assessments(person_id, round, year_month, raw_answers, status, assessor_account_id, scoring_mode)
  values (p_person_id, coalesce(p_round,'pre'), p_year_month, coalesce(p_raw_answers,'{}'::jsonb),
          coalesce(p_status,'submitted'), v_uid, 'derived')
  on conflict (person_id, year_month) do update
    set raw_answers = excluded.raw_answers, round = excluded.round,
        status = excluded.status, scoring_mode = 'derived',
        assessor_account_id = coalesce(excluded.assessor_account_id, public.person_assessments.assessor_account_id),
        updated_at = now()
  returning id, aai_overall, has_clinical_flag into v_id, v_overall, v_flag;
  return jsonb_build_object('assessment_id', v_id, 'aai_overall', v_overall, 'has_clinical_flag', v_flag);
end$function$;
revoke all on function public.assess_person(uuid,text,text,jsonb,text,uuid) from public, anon;
grant execute on function public.assess_person(uuid,text,text,jsonb,text,uuid) to authenticated, service_role;

-- ── 4. Integration onboarding gate ────────────────────────────────────────────────────────────────
alter table public.projects add column if not exists individual_integration_enabled boolean not null default false;
alter table public.projects add column if not exists individual_integration_enabled_at timestamptz;
alter table public.projects add column if not exists individual_integration_enabled_by text;

create table if not exists public.project_integration_requests (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  account_id     uuid,
  requester_name text,
  status         text not null default 'pending' check (status in ('pending','approved','rejected')),
  note           text,
  requested_at   timestamptz not null default now(),
  decided_at     timestamptz,
  decided_by     text
);
create unique index if not exists uq_pir_one_pending on public.project_integration_requests(project_id) where status = 'pending';
create index if not exists idx_pir_status on public.project_integration_requests(status);
alter table public.project_integration_requests enable row level security;  -- direct access denied; RPCs are security-definer

create or replace function public.web_request_integration(p_project uuid, p_actor uuid default null, p_note text default null)
 returns text language plpgsql security definer set search_path to 'public'
as $function$
declare v_uid uuid := coalesce(auth.uid(), p_actor); v_enabled boolean; v_name text;
begin
  select individual_integration_enabled into v_enabled from public.projects where id = p_project;
  if v_enabled is null then return 'no_project'; end if;
  if v_enabled then return 'already_enabled'; end if;
  if exists (select 1 from public.project_integration_requests where project_id = p_project and status = 'pending')
    then return 'exists'; end if;
  select name into v_name from public.accounts where id = v_uid;
  insert into public.project_integration_requests(project_id, account_id, requester_name, note)
  values (p_project, v_uid, v_name, p_note);
  return 'ok';
end$function$;

create or replace function public.web_list_integration_requests()
 returns table(request_id uuid, project_id uuid, source_project_id integer, project_name text, requester_name text, requested_at timestamptz)
 language sql security definer set search_path to 'public'
as $function$
  select r.id, r.project_id, p.source_project_id, p.name, r.requester_name, r.requested_at
  from public.project_integration_requests r
  join public.projects p on p.id = r.project_id
  where r.status = 'pending'
  order by r.requested_at asc;
$function$;

create or replace function public.web_approve_integration(p_request_id uuid, p_by text default 'admin')
 returns table(line_user_id text, project_name text)
 language plpgsql security definer set search_path to 'public'
as $function$
declare v_project uuid; v_acct uuid;
begin
  update public.project_integration_requests
    set status='approved', decided_at=now(), decided_by=p_by
    where id = p_request_id and status='pending'
    returning project_id, account_id into v_project, v_acct;
  if v_project is null then return; end if;
  update public.projects
    set individual_integration_enabled = true,
        individual_integration_enabled_at = now(),
        individual_integration_enabled_by = p_by
    where id = v_project;
  return query
    select a.line_user_id, p.name
    from public.projects p left join public.accounts a on a.id = v_acct
    where p.id = v_project;
end$function$;

create or replace function public.web_reject_integration(p_request_id uuid, p_by text default 'admin')
 returns boolean language plpgsql security definer set search_path to 'public'
as $function$
declare n int;
begin
  update public.project_integration_requests
    set status='rejected', decided_at=now(), decided_by=p_by
    where id = p_request_id and status='pending';
  get diagnostics n = row_count;
  return n > 0;
end$function$;

revoke all on function public.web_request_integration(uuid,uuid,text)   from public, anon;
revoke all on function public.web_list_integration_requests()           from public, anon;
revoke all on function public.web_approve_integration(uuid,text)        from public, anon;
revoke all on function public.web_reject_integration(uuid,text)         from public, anon;
grant execute on function public.web_request_integration(uuid,uuid,text)   to authenticated, service_role;
grant execute on function public.web_list_integration_requests()           to authenticated, service_role;
grant execute on function public.web_approve_integration(uuid,text)        to authenticated, service_role;
grant execute on function public.web_reject_integration(uuid,text)         to authenticated, service_role;

-- ── 5. Re-score existing DERIVED rows under the new version (scoped: manual rows are unaffected by the
--       scorer change, so leave them untouched; 0 derived rows today → no-op) ─────────────────────────
update public.person_assessments set updated_at = now() where scoring_mode = 'derived';
