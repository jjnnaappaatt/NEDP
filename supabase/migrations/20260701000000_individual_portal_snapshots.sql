-- ============================================================================
-- General individual-entry portal — monthly snapshots, manual 4-domain entry,
-- project-scoped name search, อสม. counts, multi-level rollup.
-- ----------------------------------------------------------------------------
-- Builds on 20260629000000_individual_aai_platform.sql. The DB is empty, so the
-- pre/post → snapshot reshape needs no row rewrites; the only live consumer of the
-- pivot (/exec/tambon via getTambonDimensionSummary) keeps working because the
-- pivot's PUBLIC column names are preserved (a one-line data-layer change ships in
-- the same deploy to drop the now-meaningless year_month filter).
--
-- User-locked decisions encoded here:
--   • Direct 4-domain entry (scoring_mode='manual') — staff type D1–D4, Overall auto.
--   • Project-scoped, audit-logged name search (distinct from the clinical reidentify gate).
--   • First assessment per person = baseline; +10% vs baseline metric.
-- ============================================================================

-- 1. scoring_mode: 'manual' (typed D1–D4) vs 'derived' (22-indicator NEDP path) ---
alter table public.person_assessments
  add column if not exists scoring_mode text not null default 'derived'
    check (scoring_mode in ('manual','derived'));

-- 2. Trigger: branch on scoring_mode. The 'derived' branch is byte-for-byte the
--    original; the 'manual' branch computes Overall from the typed domains with
--    weights renormalized over the non-NULL domains, and leaves the 22 indicator
--    cols + clinical flags untouched (manual entry carries no clinical screening).
create or replace function public.fn_score_person_assessment()
returns trigger language plpgsql set search_path = public, extensions as $$
declare v_age int; v_edu int; v_occ int; v_proj uuid; v_tambon char(6); ind jsonb; sc jsonb;
        w1 numeric; w2 numeric; w3 numeric; w4 numeric; wsum numeric;
begin
  -- FK backfill from persons (both modes)
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

  -- ── derived path (unchanged) ──────────────────────────────────────────────
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

-- 3. Snapshot identity: one assessment per person per month (drop pre/post key) ---
do $$
declare c text;
begin
  select con.conname into c
  from pg_constraint con
  where con.conrelid = 'public.person_assessments'::regclass
    and con.contype = 'u'
    and (select array_agg(a.attname order by a.attname)
           from unnest(con.conkey) k
           join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k)
        = array['person_id','round','year_month']::name[]
  limit 1;
  if c is not null then
    execute format('alter table public.person_assessments drop constraint %I', c);
  end if;
end$$;
alter table public.person_assessments alter column round drop not null;
create unique index if not exists uq_pa_person_month
  on public.person_assessments(person_id, year_month);

-- assess_person (derived path) keeps working; only its conflict target changes.
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
  insert into public.person_assessments(person_id, round, year_month, raw_answers, status, assessor_account_id, scoring_mode)
  values (p_person_id, p_round, p_year_month, coalesce(p_raw_answers,'{}'::jsonb),
          coalesce(p_status,'submitted'), v_uid, 'derived')
  on conflict (person_id, year_month) do update
    set raw_answers = excluded.raw_answers, round = excluded.round,
        status = excluded.status, scoring_mode = 'derived', updated_at = now()
  returning id, aai_overall, has_clinical_flag into v_id, v_overall, v_flag;
  return jsonb_build_object('assessment_id', v_id, 'aai_overall', v_overall, 'has_clinical_flag', v_flag);
end$$;
revoke all on function public.assess_person(uuid,text,text,jsonb,text) from public, anon;
grant execute on function public.assess_person(uuid,text,text,jsonb,text) to authenticated, service_role;

-- 4. Per-person snapshot timeline: baseline (first), latest, +10%-vs-baseline -----
--    security_invoker so direct authenticated PostgREST reads still obey persons RLS;
--    the matview + rollup fn read it as postgres/definer (RLS bypassed) by design.
create or replace view public.person_assessment_points
with (security_invoker = true) as
with ranked as (
  select pa.*,
    row_number() over (partition by pa.person_id order by pa.year_month asc,  pa.created_at asc)  as rn_first,
    row_number() over (partition by pa.person_id order by pa.year_month desc, pa.created_at desc) as rn_last,
    first_value(pa.aai_overall) over (
      partition by pa.person_id order by pa.year_month asc, pa.created_at asc
      rows between unbounded preceding and unbounded following) as baseline_overall
  from public.person_assessments pa
  where pa.status in ('submitted','approved')
)
select r.*,
  (r.rn_first = 1) as is_baseline,
  (r.rn_last  = 1) as is_latest,
  case when r.baseline_overall is not null and r.baseline_overall > 0 and r.aai_overall is not null
       then (r.aai_overall >= r.baseline_overall * 1.10) end as aai_up_10pct
from ranked r;
grant select on public.person_assessment_points to authenticated, service_role;

-- 5. อสม. (village health volunteer) trained counts — manual, per project×tambon×month
create table if not exists public.tambon_osm_counts (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete set null,
  tambon_code char(6) references public.geo_tambon(tambon_code),
  year_month  text not null,
  osm_before  integer check (osm_before >= 0),
  osm_after   integer check (osm_after  >= 0),
  entered_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (project_id, tambon_code, year_month)
);
create index if not exists idx_osm_tambon_month on public.tambon_osm_counts(tambon_code, year_month);
alter table public.tambon_osm_counts enable row level security;
drop policy if exists osm_member_read on public.tambon_osm_counts;
create policy osm_member_read on public.tambon_osm_counts for select
  using (project_id in (
    select project_id from public.project_account_registrations where account_id = auth.uid()));
grant select on public.tambon_osm_counts to authenticated, service_role;

create or replace function public.upsert_osm_count(
  p_project_id uuid, p_tambon_code char(6), p_year_month text,
  p_osm_before integer default null, p_osm_after integer default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is not null and not exists (
      select 1 from public.project_account_registrations r
      where r.project_id = p_project_id and r.account_id = v_uid and r.role in ('owner','submitter')
  ) then raise exception 'not authorized'; end if;
  insert into public.tambon_osm_counts(project_id, tambon_code, year_month, osm_before, osm_after, entered_by)
  values (p_project_id, p_tambon_code, p_year_month, p_osm_before, p_osm_after, v_uid)
  on conflict (project_id, tambon_code, year_month) do update
    set osm_before = excluded.osm_before, osm_after = excluded.osm_after, updated_at = now()
  returning id into v_id;
  return v_id;
end$$;
revoke all on function public.upsert_osm_count(uuid,char,text,integer,integer) from public, anon;
grant execute on function public.upsert_osm_count(uuid,char,text,integer,integer) to authenticated, service_role;

-- 6. Project-scoped, audit-logged name search (does NOT touch reidentify_person) --
create table if not exists restricted.name_lookup_log (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid,
  looked_up_by  uuid,
  query_text    text,
  match_count   int,
  looked_up_at  timestamptz not null default now()
);
create index if not exists idx_person_names_project on restricted.person_names(project_id);

drop function if exists public.search_persons_by_name(uuid,text,int);
create or replace function public.search_persons_by_name(
  p_project_id uuid, p_query text default '', p_tambon_code char(6) default null, p_limit int default 50
) returns table (
  person_id uuid, person_code text, full_name text,
  tambon_code char(6), tambon_th text, sex text, age_band text,
  latest_year_month text, latest_overall numeric, has_clinical_flag boolean
)
language plpgsql security definer set search_path = public, restricted, extensions as $$
declare v_uid uuid := auth.uid(); v_q text := btrim(coalesce(p_query,'')); v_n int;
begin
  if v_uid is not null and not exists (
      select 1 from public.project_account_registrations r
      where r.project_id = p_project_id and r.account_id = v_uid and r.role in ('owner','submitter')
  ) then raise exception 'not authorized to search persons in this project'; end if;

  return query
  with dec as (
    select pn.person_id,
           extensions.pgp_sym_decrypt(pn.enc_name, restricted._name_key()) as nm
    from restricted.person_names pn
    where pn.project_id = p_project_id
  ),
  matched as (
    select p.id, p.person_code, d.nm, p.tambon_code, gt.tambon_th, p.sex, p.age_band
    from public.persons p
    join dec d on d.person_id = p.id
    left join public.geo_tambon gt on gt.tambon_code = p.tambon_code
    where p.project_id = p_project_id
      and (p_tambon_code is null or p.tambon_code = p_tambon_code)
      and (v_q = '' or d.nm ilike '%'||v_q||'%')
    order by case when v_q <> '' then extensions.similarity(d.nm, v_q) else 0 end desc nulls last, p.person_code
    limit greatest(1, least(coalesce(p_limit,50), 200))
  )
  select m.id, m.person_code, m.nm, m.tambon_code, m.tambon_th, m.sex, m.age_band,
         lp.year_month, lp.aai_overall, lp.has_clinical_flag
  from matched m
  left join public.person_assessment_points lp on lp.person_id = m.id and lp.is_latest;

  get diagnostics v_n = row_count;
  insert into restricted.name_lookup_log(project_id, looked_up_by, query_text, match_count)
  values (p_project_id, v_uid,
          case when p_tambon_code is not null then 'tambon:'||p_tambon_code||' q:'||v_q else v_q end, v_n);
end$$;
-- name-decryption: service-role only (app calls via service-role, app-layer gated); not exposed to authenticated PostgREST
revoke all on function public.search_persons_by_name(uuid,text,char,int) from public, anon, authenticated;
grant execute on function public.search_persons_by_name(uuid,text,char,int) to service_role;

create or replace function public.get_person_name(p_person_id uuid) returns text
language plpgsql security definer set search_path = public, restricted, extensions as $$
declare v_uid uuid := auth.uid(); v_proj uuid; v_name text;
begin
  select project_id into v_proj from public.persons where id = p_person_id;
  if v_uid is not null and not exists (
      select 1 from public.project_account_registrations r
      where r.project_id = v_proj and r.account_id = v_uid and r.role in ('owner','submitter')
  ) then raise exception 'not authorized'; end if;
  select extensions.pgp_sym_decrypt(pn.enc_name, restricted._name_key())
    into v_name from restricted.person_names pn where pn.person_id = p_person_id;
  insert into restricted.name_lookup_log(project_id, looked_up_by, query_text, match_count)
  values (v_proj, v_uid, 'get:'||p_person_id::text, case when v_name is null then 0 else 1 end);
  return v_name;
end$$;
revoke all on function public.get_person_name(uuid) from public, anon, authenticated;
grant execute on function public.get_person_name(uuid) to service_role;

-- 7. Manual 4-domain assessment RPC -------------------------------------------
create or replace function public.assess_person_manual(
  p_person_id uuid, p_year_month text,
  p_d1 numeric default null, p_d2 numeric default null,
  p_d3 numeric default null, p_d4 numeric default null,
  p_status text default 'submitted'
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := auth.uid(); v_proj uuid; v_id uuid; v_overall numeric;
begin
  select project_id into v_proj from public.persons where id = p_person_id;
  if v_proj is null then raise exception 'person not found'; end if;
  if v_uid is not null and not exists (
      select 1 from public.project_account_registrations r
      where r.project_id = v_proj and r.account_id = v_uid and r.role in ('owner','submitter')
  ) then raise exception 'not authorized to assess for this project'; end if;
  insert into public.person_assessments(
      person_id, year_month, scoring_mode, status,
      aai_d1, aai_d2, aai_d3, aai_d4, assessor_account_id, raw_answers)
  values (p_person_id, p_year_month, 'manual', coalesce(p_status,'submitted'),
          p_d1, p_d2, p_d3, p_d4, v_uid, '{}'::jsonb)
  on conflict (person_id, year_month) do update
    set aai_d1 = excluded.aai_d1, aai_d2 = excluded.aai_d2,
        aai_d3 = excluded.aai_d3, aai_d4 = excluded.aai_d4,
        scoring_mode = 'manual', status = excluded.status, updated_at = now()
  returning id, aai_overall into v_id, v_overall;
  return jsonb_build_object('assessment_id', v_id, 'aai_overall', v_overall);
end$$;
revoke all on function public.assess_person_manual(uuid,text,numeric,numeric,numeric,numeric,text) from public, anon;
grant execute on function public.assess_person_manual(uuid,text,numeric,numeric,numeric,numeric,text) to authenticated, service_role;

-- 8. Verify/approve one assessment (owner only) -------------------------------
create or replace function public.approve_person_assessment(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_proj uuid;
begin
  select project_id into v_proj from public.person_assessments where id = p_id;
  if v_uid is not null and not exists (
      select 1 from public.project_account_registrations r
      where r.project_id = v_proj and r.account_id = v_uid and r.role = 'owner'
  ) then raise exception 'not authorized'; end if;
  update public.person_assessments set status = 'approved', updated_at = now() where id = p_id;
end$$;
revoke all on function public.approve_person_assessment(uuid) from public, anon;
grant execute on function public.approve_person_assessment(uuid) to authenticated, service_role;

-- 9. Multi-level snapshot rollup (the new dashboard's single source) -----------
--    Per geo level, returns baseline / prev-month / latest-month for Overall+D1–D4,
--    #elderly, #+10%, อสม. before/after, and an n<5 suppression flag.
create or replace function public.aai_rollup_snapshots(
  p_level text, p_latest_month text, p_prev_month text, p_project_ids uuid[] default null
) returns table (
  geo_code text, province_th text, amphoe_th text, tambon_th text,
  n_elderly int, n_up10 int, osm_before int, osm_after int,
  base_overall numeric, prev_overall numeric, latest_overall numeric,
  base_d1 numeric, prev_d1 numeric, latest_d1 numeric,
  base_d2 numeric, prev_d2 numeric, latest_d2 numeric,
  base_d3 numeric, prev_d3 numeric, latest_d3 numeric,
  base_d4 numeric, prev_d4 numeric, latest_d4 numeric,
  suppressed boolean
)
language sql stable security definer set search_path = public as $$
  with pts as (
    select pp.*, gt.province_th, gt.amphoe_th, gt.tambon_th,
      case p_level when 'province' then gt.province_code::text
                   when 'amphoe'   then gt.amphoe_code::text
                   else gt.tambon_code::text end as geo_code
    from public.person_assessment_points pp
    join public.geo_tambon gt on gt.tambon_code = pp.tambon_code
    where pp.tambon_code is not null
      and (p_project_ids is null or pp.project_id = any(p_project_ids))
  ),
  per_person as (
    select distinct on (person_id) person_id, geo_code,
           province_th, amphoe_th, tambon_th, aai_up_10pct
    from pts where is_latest order by person_id
  ),
  agg as (
    select geo_code,
      max(province_th) province_th, max(amphoe_th) amphoe_th, max(tambon_th) tambon_th,
      count(*) n_elderly,
      count(*) filter (where aai_up_10pct) n_up10
    from per_person group by geo_code
  ),
  base as (select geo_code, avg(aai_overall) o, avg(aai_d1) d1, avg(aai_d2) d2, avg(aai_d3) d3, avg(aai_d4) d4
           from pts where is_baseline group by geo_code),
  prev as (select geo_code, avg(aai_overall) o, avg(aai_d1) d1, avg(aai_d2) d2, avg(aai_d3) d3, avg(aai_d4) d4
           from pts where year_month = p_prev_month group by geo_code),
  latest as (select geo_code, avg(aai_overall) o, avg(aai_d1) d1, avg(aai_d2) d2, avg(aai_d3) d3, avg(aai_d4) d4
             from pts where is_latest group by geo_code),
  osm as (
    select case p_level when 'province' then g.province_code::text
                        when 'amphoe'   then g.amphoe_code::text
                        else oc.tambon_code::text end as geo_code,
           sum(oc.osm_before) osm_before, sum(oc.osm_after) osm_after
    from public.tambon_osm_counts oc
    join public.geo_tambon g on g.tambon_code = oc.tambon_code
    where oc.year_month = p_latest_month
      and (p_project_ids is null or oc.project_id = any(p_project_ids))
    group by 1
  )
  select a.geo_code, a.province_th, a.amphoe_th, a.tambon_th,
    a.n_elderly::int, a.n_up10::int, coalesce(o.osm_before,0)::int, coalesce(o.osm_after,0)::int,
    round(b.o,2), round(p.o,2), round(l.o,2),
    round(b.d1,2), round(p.d1,2), round(l.d1,2),
    round(b.d2,2), round(p.d2,2), round(l.d2,2),
    round(b.d3,2), round(p.d3,2), round(l.d3,2),
    round(b.d4,2), round(p.d4,2), round(l.d4,2),
    (a.n_elderly < 5) as suppressed
  from agg a
  left join base   b on b.geo_code = a.geo_code
  left join prev   p on p.geo_code = a.geo_code
  left join latest l on l.geo_code = a.geo_code
  left join osm    o on o.geo_code = a.geo_code;
$$;
revoke all on function public.aai_rollup_snapshots(text,text,text,uuid[]) from public, anon;
grant execute on function public.aai_rollup_snapshots(text,text,text,uuid[]) to authenticated, service_role;

-- 10. Redefine the tambon rollup in terms of baseline-vs-latest snapshots -------
--     The matview drops/recreates (cascading the old pivot); the pivot KEEPS its
--     public column names so getTambonDimensionSummary + /exec/tambon are unchanged.
drop materialized view if exists public.tambon_aai_monthly cascade;
create materialized view public.tambon_aai_monthly as
select pp.tambon_code, gt.province_th, gt.amphoe_th, gt.tambon_th, pp.project_id,
  count(*) filter (where pp.is_baseline) as n_baseline,
  count(*) filter (where pp.is_latest)   as n_latest,
  round(avg(pp.aai_d1)      filter (where pp.is_baseline),2) as d1_base,
  round(avg(pp.aai_d1)      filter (where pp.is_latest),2)   as d1_latest,
  round(avg(pp.aai_d2)      filter (where pp.is_baseline),2) as d2_base,
  round(avg(pp.aai_d2)      filter (where pp.is_latest),2)   as d2_latest,
  round(avg(pp.aai_d3)      filter (where pp.is_baseline),2) as d3_base,
  round(avg(pp.aai_d3)      filter (where pp.is_latest),2)   as d3_latest,
  round(avg(pp.aai_d4)      filter (where pp.is_baseline),2) as d4_base,
  round(avg(pp.aai_d4)      filter (where pp.is_latest),2)   as d4_latest,
  round(avg(pp.aai_overall) filter (where pp.is_baseline),2) as ov_base,
  round(avg(pp.aai_overall) filter (where pp.is_latest),2)   as ov_latest,
  count(*) filter (where pp.is_baseline and pp.has_clinical_flag) as n_flag_base,
  count(*) filter (where pp.is_latest   and pp.has_clinical_flag) as n_flag_latest
from public.person_assessment_points pp
join public.geo_tambon gt on gt.tambon_code = pp.tambon_code
where pp.tambon_code is not null
group by pp.tambon_code, gt.province_th, gt.amphoe_th, gt.tambon_th, pp.project_id;
create unique index uq_tambon_aai_monthly on public.tambon_aai_monthly(tambon_code, project_id);
create index idx_tambon_aai_monthly_prov on public.tambon_aai_monthly(province_th);

create or replace view public.tambon_aai_monthly_pivot with (security_invoker = true) as
select tambon_code, province_th, amphoe_th, tambon_th,
  null::text as year_month,                       -- deprecated: snapshot pivot is baseline→latest, not month-keyed
  project_id,
  n_baseline as n_pre, n_latest as n_post,
  case when n_baseline >= 5 then d1_base   end as aai_d1_before,
  case when n_latest   >= 5 then d1_latest end as aai_d1_after,
  case when n_baseline >= 5 then d2_base   end as aai_d2_before,
  case when n_latest   >= 5 then d2_latest end as aai_d2_after,
  case when n_baseline >= 5 then d3_base   end as aai_d3_before,
  case when n_latest   >= 5 then d3_latest end as aai_d3_after,
  case when n_baseline >= 5 then d4_base   end as aai_d4_before,
  case when n_latest   >= 5 then d4_latest end as aai_d4_after,
  case when n_baseline >= 5 then ov_base   end as overall_before,
  case when n_latest   >= 5 then ov_latest end as overall_after,
  n_flag_base   as n_flag_pre,
  n_flag_latest as n_flag_post
from public.tambon_aai_monthly;

-- pivot is security_invoker + read only via the service-role server client (no anon exposure)
grant select on public.tambon_aai_monthly       to authenticated, service_role;
grant select on public.tambon_aai_monthly_pivot to authenticated, service_role;
