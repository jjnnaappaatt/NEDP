-- ============================================================================
-- M4 pilot readiness check — run before a tambon starts capturing real people.
--   psql "$DATABASE_URL" -v pid="'<project-uuid>'" -f pilot_readiness_check.sql
-- Every row should read READY; anything else lists what to fix first.
-- ============================================================================
\set ON_ERROR_STOP on

with proj as (select id, name from public.projects where id = :pid),
staff as (
  select r.account_id, a.name,
         (coalesce(a.phone,'') not in ('','-')) as has_phone,
         r.role
  from public.project_account_registrations r
  join public.accounts a on a.id = r.account_id
  where r.project_id = :pid
),
locs as (
  select l.tambon_code, l.province, l.amphoe, l.tambon,
         (l.tambon_code is not null) as mapped,
         exists(select 1 from public.geo_tambon g where g.tambon_code = l.tambon_code) as in_geo
  from public.project_locations l where l.project_id = :pid
)
select 'project exists'              as check,
       case when exists(select 1 from proj) then 'READY' else 'MISSING project '||:pid end as status
union all
select 'staff registered (owner/submitter w/ phone)',
       case when exists(select 1 from staff where role in ('owner','submitter') and has_phone)
            then 'READY ('||(select count(*) from staff where role in ('owner','submitter') and has_phone)::text||' staff)'
            else 'NONE — register a contact with a phone via /submit' end
union all
select 'locations have TIS-1099 tambon_code',
       case when not exists(select 1 from locs) then 'no locations yet (enroll uses geo drill-down directly — ok)'
            when bool_and(mapped) then 'READY (all '||(select count(*) from locs)::text||' mapped)'
            else (select count(*) from locs where not mapped)::text||' location(s) NOT mapped — backfill tambon_code' end
union all
select 'mapped tambons exist in geo_tambon',
       case when not exists(select 1 from locs where mapped) then 'n/a'
            when bool_and(in_geo) then 'READY'
            else (select count(*) from locs where mapped and not in_geo)::text||' tambon_code(s) not in geo_tambon' end
union all
select 'name-encryption key present (Vault)',
       case when exists(select 1 from vault.secrets where name='aai_person_name_key') then 'READY' else 'MISSING aai_person_name_key' end
union all
select 'rollup refresh job scheduled',
       case when exists(select 1 from cron.job where jobname='refresh-tambon-aai') then 'READY (*/30 min)' else 'NOT scheduled' end;
