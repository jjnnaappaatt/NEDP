-- ============================================================================
-- Individual-level AAI by Tambon (รายตำบล) — full platform DDL
-- ----------------------------------------------------------------------------
-- Captures the individual-AAI feature applied to prod (<prod-ref>) via
-- Supabase migrations 20260629085444 … 20260629144108 (+ the Vault secret created
-- out-of-band). ASSUMES the Phase-2 baseline in ../schema.sql already exists
-- (projects, project_locations, project_account_registrations, location_submissions, …).
-- Idempotent where practical. Data steps (geo seed, project_locations backfill) are
-- NOT here — see README.md.
-- ============================================================================

-- 0. Extensions ---------------------------------------------------------------
create schema if not exists extensions;
create extension if not exists pgcrypto  with schema extensions;
create extension if not exists pg_trgm   with schema extensions;
create extension if not exists pg_cron;

-- 1. Geography dimension (TIS-1099 tambon = province2+amphoe2+tambon2) ---------
create table if not exists public.geo_tambon (
  tambon_code             char(6) primary key,
  province_code           char(2) not null,
  amphoe_code             char(4) not null,
  province_th             text not null,
  amphoe_th               text not null,
  tambon_th               text not null,
  province_en             text,
  amphoe_en               text,
  tambon_en               text,
  postal_code             text,
  geo_join_key            text not null,
  is_map_ready            boolean not null default false,
  life_exp_55_est         numeric(4,1),
  healthy_life_exp_55_est numeric(4,1),
  centroid_lat            numeric(9,6),
  centroid_lon            numeric(9,6),
  created_at              timestamptz not null default now()
);
create index  if not exists idx_geo_tambon_province on public.geo_tambon(province_code);
create index  if not exists idx_geo_tambon_amphoe   on public.geo_tambon(amphoe_code);
create unique index if not exists uq_geo_tambon_joinkey on public.geo_tambon(geo_join_key);
create index  if not exists idx_geo_tambon_names    on public.geo_tambon(province_th, amphoe_th, tambon_th);
alter table public.geo_tambon enable row level security;
drop policy if exists geo_tambon_read on public.geo_tambon;
create policy geo_tambon_read on public.geo_tambon for select using (true);
grant select on public.geo_tambon to anon, authenticated;

-- project_locations gets a standardized tambon_code (text triple stays for back-compat)
alter table public.project_locations
  add column if not exists tambon_code char(6) references public.geo_tambon(tambon_code);
create index if not exists idx_project_locations_tambon on public.project_locations(tambon_code);

-- 2. Name-encryption key in Supabase Vault (generated server-side, never in repo) --
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'aai_person_name_key') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'aai_person_name_key',
      'AES key for restricted.person_names (pgp_sym_encrypt of elderly person full name)');
  end if;
end$$;

-- 3. De-identified analytical person ------------------------------------------
create table if not exists public.persons (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete set null,
  person_code     text not null,
  tambon_code     char(6) references public.geo_tambon(tambon_code),
  sex             text     check (sex in ('M','F','other')),
  age_band        text     check (age_band in ('55-59','60-64','65-69','70-74','75+')),
  education_level smallint check (education_level between 0 and 4),
  occupation_code smallint check (occupation_code between 0 and 4),
  enrolled_at     timestamptz not null default now(),
  enrolled_by     uuid,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (project_id, person_code)
);
create index if not exists idx_persons_tambon  on public.persons(tambon_code);
create index if not exists idx_persons_project on public.persons(project_id);
alter table public.persons enable row level security;
drop policy if exists persons_member_read on public.persons;
create policy persons_member_read on public.persons for select
  using (project_id in (
    select project_id from public.project_account_registrations where account_id = auth.uid()));
grant select on public.persons to authenticated;

-- 4. Restricted schema: encrypted real name (referral lookup only) -------------
create schema if not exists restricted;
revoke all on schema restricted from public;
revoke all on schema restricted from anon, authenticated;

create table if not exists restricted.person_names (
  person_id       uuid primary key references public.persons(id) on delete cascade,
  project_id      uuid not null,
  person_code     text not null,
  enc_name        bytea not null,
  consent_version text,
  consent_at      timestamptz,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create table if not exists restricted.reidentification_log (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid,
  project_id    uuid,
  person_code   text,
  looked_up_by  uuid,
  reason        text,
  clinical_flag text,
  looked_up_at  timestamptz not null default now()
);

create or replace function restricted._name_key() returns text
language sql security definer set search_path = vault, public, extensions as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'aai_person_name_key' limit 1;
$$;
revoke all on function restricted._name_key() from public, anon, authenticated;

create or replace function public.enroll_person(
  p_project_id uuid, p_person_code text, p_full_name text, p_tambon_code char(6),
  p_sex text default null, p_age_band text default null,
  p_education smallint default null, p_occupation smallint default null,
  p_consent_version text default null
) returns uuid
language plpgsql security definer set search_path = public, restricted, extensions, vault as $$
declare v_id uuid; v_uid uuid := auth.uid();
begin
  if v_uid is not null and not exists (
      select 1 from public.project_account_registrations r
      where r.project_id = p_project_id and r.account_id = v_uid and r.role in ('owner','submitter')
  ) then
    raise exception 'not authorized to enroll for this project';
  end if;
  insert into public.persons(project_id, person_code, tambon_code, sex, age_band,
                             education_level, occupation_code, enrolled_by)
  values (p_project_id, btrim(p_person_code), p_tambon_code, p_sex, p_age_band,
          p_education, p_occupation, v_uid)
  returning id into v_id;
  if p_full_name is not null and btrim(p_full_name) <> '' then
    insert into restricted.person_names(person_id, project_id, person_code, enc_name,
                                        consent_version, consent_at, created_by)
    values (v_id, p_project_id, btrim(p_person_code),
            extensions.pgp_sym_encrypt(btrim(p_full_name), restricted._name_key()),
            p_consent_version, case when p_consent_version is not null then now() end, v_uid);
  end if;
  return v_id;
end$$;
revoke all on function public.enroll_person(uuid,text,text,char,text,text,smallint,smallint,text) from public, anon;
grant execute on function public.enroll_person(uuid,text,text,char,text,text,smallint,smallint,text) to authenticated, service_role;

-- 5. Person assessments (raw answers + 22 indicators + D1–D4/Overall + flags) ---
create table if not exists public.person_assessments (
  id                uuid primary key default gen_random_uuid(),
  person_id         uuid not null references public.persons(id) on delete cascade,
  project_id        uuid,
  tambon_code       char(6),
  round             text not null check (round in ('pre','post')),
  year_month        text not null,
  pre_assessment_id uuid references public.person_assessments(id) on delete set null,
  status            text not null default 'submitted' check (status in ('draft','submitted','approved')),
  raw_answers       jsonb not null default '{}'::jsonb,
  emp_55_59 numeric(5,2), emp_60_64 numeric(5,2), emp_65_69 numeric(5,2), emp_70_74 numeric(5,2),
  voluntary numeric(5,2), care_children numeric(5,2), care_elderly numeric(5,2), political numeric(5,2),
  physical_exercise numeric(5,2), health_access numeric(5,2), independent_living numeric(5,2),
  relative_income numeric(5,2), no_poverty_risk numeric(5,2), no_material_deprivation numeric(5,2),
  physical_safety numeric(5,2), lifelong_learning numeric(5,2),
  life_expectancy_55 numeric(5,2), healthy_life_expectancy_55 numeric(5,2), mental_wellbeing numeric(5,2),
  ict_use numeric(5,2), social_connectedness numeric(5,2), educational_attainment numeric(5,2),
  aai_d1 numeric(5,2), aai_d2 numeric(5,2), aai_d3 numeric(5,2), aai_d4 numeric(5,2), aai_overall numeric(5,2),
  scoring_version text,
  flag_mini_cog boolean not null default false,
  flag_mna      boolean not null default false,
  flag_tgds     boolean not null default false,
  flag_frail    boolean not null default false,
  has_clinical_flag boolean generated always as
    (flag_mini_cog or flag_mna or flag_tgds or flag_frail) stored,
  tool_frail smallint, tool_mna numeric(4,1), tool_tgds smallint, tool_minicog smallint,
  tool_barthel smallint, tool_fes_i smallint, tool_l_iadl smallint, tool_environment smallint, tool_eq_vas smallint,
  assessor_account_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (person_id, round, year_month)
);
create index if not exists idx_pa_person       on public.person_assessments(person_id);
create index if not exists idx_pa_project_month on public.person_assessments(project_id, year_month);
create index if not exists idx_pa_tambon_month  on public.person_assessments(tambon_code, year_month);
create index if not exists idx_pa_flags         on public.person_assessments(tambon_code, year_month) where has_clinical_flag;
alter table public.person_assessments enable row level security;
drop policy if exists pa_member_read on public.person_assessments;
create policy pa_member_read on public.person_assessments for select
  using (project_id in (
    select project_id from public.project_account_registrations where account_id = auth.uid()));
grant select on public.person_assessments to authenticated;

create table if not exists public.person_assessment_audit (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid, action text, before_data jsonb, after_data jsonb,
  changed_by uuid, changed_at timestamptz not null default now()
);
alter table public.person_assessment_audit enable row level security;
create or replace function public.fn_audit_person_assessment()
returns trigger language plpgsql set search_path = public as $$
begin
  insert into public.person_assessment_audit(assessment_id, action, before_data, after_data, changed_by)
  values (coalesce(NEW.id, OLD.id), lower(TG_OP),
          case when TG_OP <> 'INSERT' then to_jsonb(OLD) end,
          case when TG_OP <> 'DELETE' then to_jsonb(NEW) end,
          coalesce(NEW.assessor_account_id, OLD.assessor_account_id));
  return coalesce(NEW, OLD);
end$$;
drop trigger if exists trg_audit_person_assessment on public.person_assessments;
create trigger trg_audit_person_assessment
  after insert or update or delete on public.person_assessments
  for each row execute function public.fn_audit_person_assessment();

-- 6. Versioned scoring (PROVISIONAL — scoring_version 'prov-2026-06') ----------
create or replace function public.aai_derive_indicators(
  raw jsonb, p_age int, p_education int, p_occupation int, p_tambon char(6)
) returns jsonb language plpgsql stable set search_path = public, extensions as $$
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
  emp  numeric := case when p_occupation in (1,2,3) then 100 else 0 end;
  le numeric; hale numeric;
begin
  select life_exp_55_est, healthy_life_exp_55_est into le, hale
    from public.geo_tambon where tambon_code = p_tambon;
  if le is not null and hale is not null and hale > le then hale := le; end if;
  return jsonb_build_object(
    'emp_55_59', case when p_age between 55 and 59 then emp end,
    'emp_60_64', case when p_age between 60 and 64 then emp end,
    'emp_65_69', case when p_age between 65 and 69 then emp end,
    'emp_70_74', case when p_age between 70 and 74 then emp end,
    'voluntary',     case when q4 is not null then round(100*q4/4,2) end,
    'political',     case when q5 is not null then round(100*q5/4,2) end,
    'care_children', null, 'care_elderly', null,
    'physical_exercise', case when q2 is not null then round(100*q2/4,2) end,
    'health_access',     case when q7 is not null then round(100*q7/4,2) end,
    'independent_living', case when barthel is not null then least(barthel,100)
                               when q3 is not null then round(100*q3/3.0,2) else null end,
    'relative_income', null, 'no_poverty_risk', null, 'no_material_deprivation', null,
    'physical_safety',   case when env is not null then round(100*(1 - env/9.0),2) end,
    'lifelong_learning', case when q6 is not null then round(100*q6/3.0,2) end,
    'life_expectancy_55', le, 'healthy_life_expectancy_55', hale,
    'mental_wellbeing',  case when tgds is not null then round(100*(1 - tgds/15.0),2) end,
    'ict_use',           case when q6 is not null then round(100*q6/3.0,2) end,
    'social_connectedness', case when q4 is not null and q5 is not null then round(100*((q4+q5)/8.0),2) end,
    'educational_attainment', case when p_education is not null then least(round(100*p_education/3.0,2),100) end
  );
end$$;

create or replace function public.aai_score_indicators(ind jsonb)
returns jsonb language plpgsql immutable set search_path = public as $$
declare d1 numeric; d2 numeric; d3 numeric; d4 numeric; ov numeric;
begin
  d1 := coalesce((ind->>'emp_55_59')::numeric,(ind->>'emp_60_64')::numeric,
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
end$$;

create or replace function public.fn_score_person_assessment()
returns trigger language plpgsql set search_path = public, extensions as $$
declare v_age int; v_edu int; v_occ int; v_proj uuid; v_tambon char(6); ind jsonb; sc jsonb;
begin
  select pr.project_id, pr.tambon_code, pr.education_level, pr.occupation_code
    into v_proj, v_tambon, v_edu, v_occ
    from public.persons pr where pr.id = NEW.person_id;
  NEW.project_id  := coalesce(NEW.project_id,  v_proj);
  NEW.tambon_code := coalesce(NEW.tambon_code, v_tambon);
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
  NEW.scoring_version := 'prov-2026-06';
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
end$$;
drop trigger if exists trg_score_person_assessment on public.person_assessments;
create trigger trg_score_person_assessment
  before insert or update on public.person_assessments
  for each row execute function public.fn_score_person_assessment();

create or replace function public.assess_person(
  p_person_id uuid, p_round text, p_year_month text, p_raw_answers jsonb, p_status text default 'submitted'
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := auth.uid(); v_proj uuid; v_id uuid; v_overall numeric; v_flag boolean;
begin
  select project_id into v_proj from public.persons where id = p_person_id;
  if v_proj is null then raise exception 'person not found'; end if;
  if v_uid is not null and not exists (
      select 1 from public.project_account_registrations r
      where r.project_id = v_proj and r.account_id = v_uid and r.role in ('owner','submitter')
  ) then raise exception 'not authorized to assess for this project'; end if;
  insert into public.person_assessments(person_id, round, year_month, raw_answers, status, assessor_account_id)
  values (p_person_id, p_round, p_year_month, coalesce(p_raw_answers,'{}'::jsonb),
          coalesce(p_status,'submitted'), v_uid)
  on conflict (person_id, round, year_month) do update
    set raw_answers = excluded.raw_answers, status = excluded.status, updated_at = now()
  returning id, aai_overall, has_clinical_flag into v_id, v_overall, v_flag;
  return jsonb_build_object('assessment_id', v_id, 'aai_overall', v_overall, 'has_clinical_flag', v_flag);
end$$;
revoke all on function public.assess_person(uuid,text,text,jsonb,text) from public, anon;
grant execute on function public.assess_person(uuid,text,text,jsonb,text) to authenticated, service_role;

create or replace function public.recompute_person_assessments()
returns int language plpgsql security definer set search_path = public, extensions as $$
declare n int;
begin
  update public.person_assessments set updated_at = now();
  get diagnostics n = row_count;
  return n;
end$$;
revoke all on function public.recompute_person_assessments() from public, anon;
grant execute on function public.recompute_person_assessments() to service_role;

-- 7. Re-identification (gated on referral claim AND a clinical flag) -----------
create or replace function public.reidentify_person(
  p_person_id uuid, p_reason text, p_clinical_flag text default null
) returns text
language plpgsql security definer set search_path = public, restricted, extensions, vault as $$
declare v_name text; v_uid uuid := auth.uid(); v_role text := (auth.jwt() ->> 'app_role');
begin
  if v_uid is not null then
    if coalesce(v_role,'') <> 'reidentification_officer' then
      raise exception 'not authorized to re-identify';
    end if;
    if not exists (select 1 from public.person_assessments pa
                   where pa.person_id = p_person_id and pa.has_clinical_flag) then
      raise exception 're-identification allowed only for a person with a clinical flag';
    end if;
  end if;
  insert into restricted.reidentification_log(person_id, project_id, person_code, looked_up_by, reason, clinical_flag)
  select pn.person_id, pn.project_id, pn.person_code, v_uid, p_reason, p_clinical_flag
  from restricted.person_names pn where pn.person_id = p_person_id;
  select extensions.pgp_sym_decrypt(pn.enc_name, restricted._name_key())
  into v_name from restricted.person_names pn where pn.person_id = p_person_id;
  return v_name;
end$$;
revoke all on function public.reidentify_person(uuid,text,text) from public, anon;
grant execute on function public.reidentify_person(uuid,text,text) to authenticated, service_role;

-- 8. Individual → tambon rollup -----------------------------------------------
create materialized view if not exists public.tambon_aai_monthly as
select
  pa.tambon_code, gt.province_th, gt.amphoe_th, gt.tambon_th,
  pa.year_month, pa.project_id, pa.round,
  count(*)                       as n_persons,
  round(avg(pa.aai_d1), 2)       as aai_d1,
  round(avg(pa.aai_d2), 2)       as aai_d2,
  round(avg(pa.aai_d3), 2)       as aai_d3,
  round(avg(pa.aai_d4), 2)       as aai_d4,
  round(avg(pa.aai_overall), 2)  as aai_overall,
  count(*) filter (where pa.flag_mini_cog)     as n_flag_mini_cog,
  count(*) filter (where pa.flag_mna)          as n_flag_mna,
  count(*) filter (where pa.flag_tgds)         as n_flag_tgds,
  count(*) filter (where pa.flag_frail)        as n_flag_frail,
  count(*) filter (where pa.has_clinical_flag) as n_any_flag
from public.person_assessments pa
join public.geo_tambon gt on gt.tambon_code = pa.tambon_code
where pa.status in ('submitted','approved') and pa.tambon_code is not null
group by pa.tambon_code, gt.province_th, gt.amphoe_th, gt.tambon_th,
         pa.year_month, pa.project_id, pa.round;
create unique index if not exists uq_tambon_aai_monthly
  on public.tambon_aai_monthly(tambon_code, year_month, project_id, round);
create index if not exists idx_tambon_aai_monthly_month on public.tambon_aai_monthly(year_month, project_id);
create index if not exists idx_tambon_aai_monthly_prov  on public.tambon_aai_monthly(province_th, year_month);

create or replace view public.tambon_aai_monthly_pivot as
select
  pre.tambon_code, pre.province_th, pre.amphoe_th, pre.tambon_th,
  pre.year_month, pre.project_id,
  pre.n_persons  as n_pre,
  post.n_persons as n_post,
  case when pre.n_persons  >= 5 then pre.aai_d1  end as aai_d1_before,
  case when post.n_persons >= 5 then post.aai_d1 end as aai_d1_after,
  case when pre.n_persons  >= 5 then pre.aai_d2  end as aai_d2_before,
  case when post.n_persons >= 5 then post.aai_d2 end as aai_d2_after,
  case when pre.n_persons  >= 5 then pre.aai_d3  end as aai_d3_before,
  case when post.n_persons >= 5 then post.aai_d3 end as aai_d3_after,
  case when pre.n_persons  >= 5 then pre.aai_d4  end as aai_d4_before,
  case when post.n_persons >= 5 then post.aai_d4 end as aai_d4_after,
  case when pre.n_persons  >= 5 then pre.aai_overall  end as overall_before,
  case when post.n_persons >= 5 then post.aai_overall end as overall_after,
  pre.n_any_flag  as n_flag_pre,
  post.n_any_flag as n_flag_post
from public.tambon_aai_monthly pre
left join public.tambon_aai_monthly post
  on  post.tambon_code = pre.tambon_code
  and post.year_month  = pre.year_month
  and post.project_id is not distinct from pre.project_id
  and post.round = 'post'
where pre.round = 'pre';

create or replace function public.refresh_tambon_aai_monthly()
returns void language plpgsql security definer set search_path = public as $$
begin
  refresh materialized view concurrently public.tambon_aai_monthly;
end$$;
revoke all on function public.refresh_tambon_aai_monthly() from public, anon;
grant execute on function public.refresh_tambon_aai_monthly() to service_role;

grant select on public.tambon_aai_monthly       to authenticated, service_role;
grant select on public.tambon_aai_monthly_pivot to anon, authenticated, service_role;

-- 9. Scheduled refresh (pg_cron) — plain refresh is transaction-safe in cron ----
select cron.schedule('refresh-tambon-aai', '*/30 * * * *',
  $$refresh materialized view public.tambon_aai_monthly$$);
