-- Auto-generate the participant code (รหัสผู้เข้าร่วม) as a tambon-scoped running number.
-- Field staff no longer type a code: enroll_person now assigns "<tambon6>-###" (reset per ตำบล)
-- when the caller passes a null/blank code. An explicit code is still accepted (backward-compatible).

-- 1. Per-key running-number counter (definer RPC only; never touched by PostgREST clients) ----------
create table if not exists public.person_code_seq (
  seq_key  text primary key,
  last_seq bigint not null default 0
);
revoke all on public.person_code_seq from public, anon, authenticated;

-- 2. enroll_person — same 9-arg signature + returns uuid, so grants and callers are unchanged --------
create or replace function public.enroll_person(
  p_project_id uuid, p_person_code text, p_full_name text, p_tambon_code char(6),
  p_sex text default null, p_age_band text default null,
  p_education smallint default null, p_occupation smallint default null,
  p_consent_version text default null
) returns uuid
language plpgsql security definer set search_path = public, restricted, extensions, vault as $$
declare
  v_id    uuid;
  v_uid   uuid := auth.uid();
  v_code  text := nullif(btrim(coalesce(p_person_code, '')), '');  -- null/blank => auto-generate
  v_key   text;
  v_seq   bigint;
  v_gen   text;
  v_tries int := 0;
begin
  -- auth (unchanged): only project owners/submitters may enroll
  if v_uid is not null and not exists (
      select 1 from public.project_account_registrations r
      where r.project_id = p_project_id and r.account_id = v_uid and r.role in ('owner','submitter')
  ) then
    raise exception 'not authorized to enroll for this project';
  end if;

  if v_code is not null then
    -- ── explicit-code path (fully backward-compatible) ──
    insert into public.persons(project_id, person_code, tambon_code, sex, age_band,
                               education_level, occupation_code, enrolled_by)
    values (p_project_id, v_code, p_tambon_code, p_sex, p_age_band,
            p_education, p_occupation, v_uid)
    returning id into v_id;  -- unique_violation surfaces to the app as "รหัสซ้ำ"
  else
    -- ── auto-generate path: tambon-scoped running number "<tambon6>-###" ──
    v_key := p_project_id::text || ':' || btrim(p_tambon_code::text);
    loop
      v_tries := v_tries + 1;
      if v_tries > 10000 then raise exception 'could not allocate person_code'; end if;

      -- atomic bump; the row lock on seq_key serialises concurrent enrollments for this tambon,
      -- so every transaction reads a distinct last_seq. The bump is OUTSIDE the savepoint below,
      -- so a caught collision skips that number permanently (gaps are fine).
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
        exit;  -- allocated + inserted
      exception when unique_violation then
        -- generated code collided with a pre-existing (manual) code → try the next number
      end;
    end loop;
    v_code := v_gen;  -- so the encrypted-name row below stores the assigned code
  end if;

  -- encrypted real name (unchanged, uses the resolved code)
  if p_full_name is not null and btrim(p_full_name) <> '' then
    insert into restricted.person_names(person_id, project_id, person_code, enc_name,
                                        consent_version, consent_at, created_by)
    values (v_id, p_project_id, v_code,
            extensions.pgp_sym_encrypt(btrim(p_full_name), restricted._name_key()),
            p_consent_version, case when p_consent_version is not null then now() end, v_uid);
  end if;
  return v_id;
end$$;

-- re-assert grants defensively (create-or-replace with the same signature already preserves them)
revoke all on function public.enroll_person(uuid,text,text,char,text,text,smallint,smallint,text) from public, anon;
grant execute on function public.enroll_person(uuid,text,text,char,text,text,smallint,smallint,text) to authenticated, service_role;
