-- Chief visibility groundwork: fix actor attribution + audit the destructive path.
-- (1) Web writes go through the service-role client, so auth.uid() is NULL and enrolled_by /
--     assessor_account_id / entered_by were never populated. Each write RPC gains
--     `p_actor uuid default null` and attributes with coalesce(auth.uid(), p_actor).
--     The authorization check stays on auth.uid() only — p_actor is service-role-supplied
--     and already app-gated by isProjectContact().
-- (2) purge_person: log-then-delete into person_purge_audit (was an unaudited hard DELETE).
-- (3) tambon_osm_counts.updated_by: attribute revisions, not just the first entry.
-- Signatures change (added param) → drop-then-create with exact old signatures, re-assert grants.

-- 1. Purge audit table (service-role only; RLS on with no policies) --------------------------------
create table if not exists public.person_purge_audit (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid,
  project_id    uuid,
  person_code   text,
  tambon_code   char(6),
  n_assessments int,
  purged_by     uuid,
  purged_at     timestamptz not null default now()
);
alter table public.person_purge_audit enable row level security;
revoke all on public.person_purge_audit from public, anon, authenticated;

-- 2. purge_person RPC: audit + delete in one transaction -------------------------------------------
create or replace function public.purge_person(p_person_id uuid, p_project_id uuid, p_actor uuid default null)
returns boolean
language plpgsql security definer set search_path = public, restricted as $$
declare v_code text; v_tambon char(6); v_n int;
begin
  select person_code, tambon_code into v_code, v_tambon
    from public.persons where id = p_person_id and project_id = p_project_id;
  if v_code is null then return false; end if;
  select count(*) into v_n from public.person_assessments where person_id = p_person_id;
  insert into public.person_purge_audit(person_id, project_id, person_code, tambon_code, n_assessments, purged_by)
  values (p_person_id, p_project_id, v_code, v_tambon, v_n, coalesce(auth.uid(), p_actor));
  delete from public.persons where id = p_person_id and project_id = p_project_id;  -- CASCADE: assessments + enc name
  return true;
end$$;
revoke all on function public.purge_person(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.purge_person(uuid,uuid,uuid) to service_role;

-- 3. OSM revisions carry the actor ------------------------------------------------------------------
alter table public.tambon_osm_counts add column if not exists updated_by uuid;

drop function if exists public.upsert_osm_count(uuid,character,text,integer,integer);
create function public.upsert_osm_count(
  p_project_id uuid, p_tambon_code char(6), p_year_month text,
  p_osm_before integer default null, p_osm_after integer default null,
  p_actor uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_auth uuid := auth.uid(); v_uid uuid := coalesce(auth.uid(), p_actor); v_id uuid;
begin
  if v_auth is not null and not exists (
      select 1 from public.project_account_registrations r
      where r.project_id = p_project_id and r.account_id = v_auth and r.role in ('owner','submitter')
  ) then raise exception 'not authorized'; end if;
  insert into public.tambon_osm_counts(project_id, tambon_code, year_month, osm_before, osm_after, entered_by)
  values (p_project_id, p_tambon_code, p_year_month, p_osm_before, p_osm_after, v_uid)
  on conflict (project_id, tambon_code, year_month) do update
    set osm_before = excluded.osm_before, osm_after = excluded.osm_after,
        updated_by = excluded.entered_by, updated_at = now()
  returning id into v_id;
  return v_id;
end$$;
revoke all on function public.upsert_osm_count(uuid,char,text,integer,integer,uuid) from public, anon;
grant execute on function public.upsert_osm_count(uuid,char,text,integer,integer,uuid) to authenticated, service_role;

-- 4. assess_person_manual: attribute the assessor ---------------------------------------------------
drop function if exists public.assess_person_manual(uuid,text,numeric,numeric,numeric,numeric,text);
create function public.assess_person_manual(
  p_person_id uuid, p_year_month text,
  p_d1 numeric default null, p_d2 numeric default null,
  p_d3 numeric default null, p_d4 numeric default null,
  p_status text default 'submitted',
  p_actor uuid default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_auth uuid := auth.uid(); v_uid uuid := coalesce(auth.uid(), p_actor);
        v_proj uuid; v_id uuid; v_overall numeric;
begin
  select project_id into v_proj from public.persons where id = p_person_id;
  if v_proj is null then raise exception 'person not found'; end if;
  if v_auth is not null and not exists (
      select 1 from public.project_account_registrations r
      where r.project_id = v_proj and r.account_id = v_auth and r.role in ('owner','submitter')
  ) then raise exception 'not authorized to assess for this project'; end if;
  insert into public.person_assessments(
      person_id, year_month, scoring_mode, status,
      aai_d1, aai_d2, aai_d3, aai_d4, assessor_account_id, raw_answers)
  values (p_person_id, p_year_month, 'manual', coalesce(p_status,'submitted'),
          p_d1, p_d2, p_d3, p_d4, v_uid, '{}'::jsonb)
  on conflict (person_id, year_month) do update
    set aai_d1 = excluded.aai_d1, aai_d2 = excluded.aai_d2,
        aai_d3 = excluded.aai_d3, aai_d4 = excluded.aai_d4,
        scoring_mode = 'manual', status = excluded.status,
        assessor_account_id = coalesce(excluded.assessor_account_id, public.person_assessments.assessor_account_id),
        updated_at = now()
  returning id, aai_overall into v_id, v_overall;
  return jsonb_build_object('assessment_id', v_id, 'aai_overall', v_overall);
end$$;
revoke all on function public.assess_person_manual(uuid,text,numeric,numeric,numeric,numeric,text,uuid) from public, anon;
grant execute on function public.assess_person_manual(uuid,text,numeric,numeric,numeric,numeric,text,uuid) to authenticated, service_role;

-- 5. enroll_person: attribute the enroller (body otherwise identical to 20260707 auto-code version) --
drop function if exists public.enroll_person(uuid,text,text,character,text,text,smallint,smallint,text);
create function public.enroll_person(
  p_project_id uuid, p_person_code text, p_full_name text, p_tambon_code char(6),
  p_sex text default null, p_age_band text default null,
  p_education smallint default null, p_occupation smallint default null,
  p_consent_version text default null,
  p_actor uuid default null
) returns uuid
language plpgsql security definer set search_path = public, restricted, extensions, vault as $$
declare
  v_id    uuid;
  v_auth  uuid := auth.uid();
  v_uid   uuid := coalesce(auth.uid(), p_actor);
  v_code  text := nullif(btrim(coalesce(p_person_code, '')), '');  -- null/blank => auto-generate
  v_key   text;
  v_seq   bigint;
  v_gen   text;
  v_tries int := 0;
begin
  if v_auth is not null and not exists (
      select 1 from public.project_account_registrations r
      where r.project_id = p_project_id and r.account_id = v_auth and r.role in ('owner','submitter')
  ) then
    raise exception 'not authorized to enroll for this project';
  end if;

  if v_code is not null then
    insert into public.persons(project_id, person_code, tambon_code, sex, age_band,
                               education_level, occupation_code, enrolled_by)
    values (p_project_id, v_code, p_tambon_code, p_sex, p_age_band,
            p_education, p_occupation, v_uid)
    returning id into v_id;
  else
    v_key := p_project_id::text || ':' || btrim(p_tambon_code::text);
    loop
      v_tries := v_tries + 1;
      if v_tries > 10000 then raise exception 'could not allocate person_code'; end if;
      insert into public.person_code_seq(seq_key, last_seq)
      values (v_key, 1)
      on conflict (seq_key) do update set last_seq = public.person_code_seq.last_seq + 1
      returning last_seq into v_seq;
      v_gen := btrim(p_tambon_code::text) || '-' || lpad(v_seq::text, 3, '0');
      begin
        insert into public.persons(project_id, person_code, tambon_code, sex, age_band,
                                   education_level, occupation_code, enrolled_by)
        values (p_project_id, v_gen, p_tambon_code, p_sex, p_age_band,
                p_education, p_occupation, v_uid)
        returning id into v_id;
        exit;
      exception when unique_violation then
        -- collided with a pre-existing code -> next number
      end;
    end loop;
    v_code := v_gen;
  end if;

  if p_full_name is not null and btrim(p_full_name) <> '' then
    insert into restricted.person_names(person_id, project_id, person_code, enc_name,
                                        consent_version, consent_at, created_by)
    values (v_id, p_project_id, v_code,
            extensions.pgp_sym_encrypt(btrim(p_full_name), restricted._name_key()),
            p_consent_version, case when p_consent_version is not null then now() end, v_uid);
  end if;
  return v_id;
end$$;
revoke all on function public.enroll_person(uuid,text,text,char,text,text,smallint,smallint,text,uuid) from public, anon;
grant execute on function public.enroll_person(uuid,text,text,char,text,text,smallint,smallint,text,uuid) to authenticated, service_role;
