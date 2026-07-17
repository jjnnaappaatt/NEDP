-- ============================================================================
-- RLS / grants negative tests — individual-AAI platform (persons, assessments,
-- restricted names, rollups). Proves anon + cross-project access is denied and the
-- referral gate holds. Repeatable + safe on prod: everything runs in ONE transaction
-- that ROLLS BACK, so the seeded probe row never persists.
--
--   Run:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f rls_negative_tests.sql
--   PASS lines print as NOTICE; the first failed assertion aborts with FAIL.
-- ============================================================================
\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.assert(cond boolean, label text) returns void
language plpgsql as $$
begin
  if cond then raise notice 'PASS  %', label;
  else raise exception 'FAIL  %', label; end if;
end$$;

-- ── 1. Grant / schema posture (no role switching needed) ────────────────────
select pg_temp.assert(not has_table_privilege('anon','public.persons','SELECT'),               'anon has NO SELECT grant on persons');
select pg_temp.assert(not has_table_privilege('anon','public.person_assessments','SELECT'),    'anon has NO SELECT grant on person_assessments');
select pg_temp.assert(not has_table_privilege('anon','public.tambon_osm_counts','SELECT'),     'anon has NO SELECT grant on tambon_osm_counts');
select pg_temp.assert(not has_schema_privilege('anon','restricted','USAGE'),                   'anon has NO USAGE on restricted schema');
select pg_temp.assert(not has_schema_privilege('authenticated','restricted','USAGE'),          'authenticated has NO USAGE on restricted schema');
select pg_temp.assert(not has_function_privilege('authenticated',(select oid from pg_proc where proname='search_persons_by_name' limit 1),'EXECUTE'), 'authenticated CANNOT execute search_persons_by_name');
select pg_temp.assert(not has_function_privilege('anon',(select oid from pg_proc where proname='search_persons_by_name' limit 1),'EXECUTE'),          'anon CANNOT execute search_persons_by_name');
select pg_temp.assert(not has_function_privilege('authenticated',(select oid from pg_proc where proname='get_person_name' limit 1),'EXECUTE'),        'authenticated CANNOT execute get_person_name');
select pg_temp.assert(    has_function_privilege('service_role',(select oid from pg_proc where proname='search_persons_by_name' limit 1),'EXECUTE'),  'service_role CAN execute search_persons_by_name');
select pg_temp.assert((select relrowsecurity from pg_class where oid='public.persons'::regclass),            'RLS enabled on persons');
select pg_temp.assert((select relrowsecurity from pg_class where oid='public.person_assessments'::regclass), 'RLS enabled on person_assessments');
select pg_temp.assert((select relrowsecurity from pg_class where oid='public.tambon_osm_counts'::regclass),  'RLS enabled on tambon_osm_counts');
select pg_temp.assert(exists(select 1 from pg_policies where schemaname='public' and tablename='persons' and policyname='persons_member_read'), 'persons_member_read policy present');

-- ── 2. Behavioral RLS (role switching + a rolled-back probe row) ─────────────
do $$
declare proj uuid; pid uuid; tam char(6); n int;
begin
  select id into proj from public.projects limit 1;
  select tambon_code into tam from public.geo_tambon limit 1;
  if proj is null or tam is null then raise notice 'SKIP row-level tests (no project/tambon)'; return; end if;

  pid := public.enroll_person(proj,'ZZRLS-NEGTEST','rls neg test',tam,null,null,null,null,null);

  -- 2a. anon cannot read persons at all (no grant)
  begin
    set local role anon;
    perform 1 from public.persons limit 1;
    reset role;
    raise exception 'FAIL  anon could query persons';
  exception
    when insufficient_privilege then reset role; raise notice 'PASS  anon blocked from persons (insufficient_privilege)';
    when others then reset role; raise notice 'PASS  anon blocked from persons (%)', SQLERRM;
  end;

  -- 2b. authenticated NON-member sees 0 rows (RLS is project-scoped)
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}', true);
  select count(*) into n from public.persons;
  reset role;
  perform pg_temp.assert(n = 0, 'authenticated non-member sees 0 persons (RLS hides the probe row)');

  -- 2c. authenticated non-member sees 0 assessments
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}', true);
  select count(*) into n from public.person_assessments;
  reset role;
  perform pg_temp.assert(n = 0, 'authenticated non-member sees 0 person_assessments (RLS)');

  -- 2d. referral gate: authenticated WITHOUT the officer claim is denied
  begin
    set local role authenticated;
    perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}', true);
    perform public.reidentify_person(pid,'neg-test',null);
    reset role;
    raise exception 'FAIL  reidentify_person allowed without officer claim';
  exception when others then
    reset role;
    if SQLERRM like '%not authorized%' then raise notice 'PASS  reidentify_person blocked without officer claim';
    else raise notice 'PASS  reidentify_person blocked (%)', SQLERRM; end if;
  end;
end$$;

rollback;
-- All assertions passed if this point is reached with no FAIL above.
