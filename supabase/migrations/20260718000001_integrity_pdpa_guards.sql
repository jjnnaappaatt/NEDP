-- Launch-audit fixes: consent-always-persisted, complete purge erasure, manual-over-derived guard.

-- ── (1) Consent persisted for EVERY enrollment (not only when a name is supplied) ───────────────────
-- consent lived only on restricted.person_names, written only if a name was given — but the name is
-- optional while the consent tick is required, so a no-name enrollment recorded NO consent (PDPA gap).
alter table public.persons add column if not exists consent_version text;
alter table public.persons add column if not exists consent_at timestamptz;

create or replace function public.enroll_person(p_project_id uuid, p_person_code text, p_full_name text, p_tambon_code character, p_sex text default null::text, p_age_band text default null::text, p_education smallint default null::smallint, p_occupation smallint default null::smallint, p_consent_version text default null::text, p_actor uuid default null::uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public', 'restricted', 'extensions', 'vault'
as $function$
declare
  v_id uuid; v_auth uuid := auth.uid(); v_uid uuid := coalesce(auth.uid(), p_actor);
  v_code text := nullif(btrim(coalesce(p_person_code, '')), '');
  v_key text; v_seq bigint; v_gen text; v_tries int := 0;
begin
  -- PDPA: consent is mandatory to create a person record.
  if p_consent_version is null or btrim(p_consent_version) = '' then
    raise exception 'consent required';
  end if;
  if v_auth is not null and not exists (
      select 1 from public.project_account_registrations r
      where r.project_id = p_project_id and r.account_id = v_auth and r.role in ('owner','submitter')
  ) then raise exception 'not authorized to enroll for this project'; end if;

  if v_code is not null then
    insert into public.persons(project_id, person_code, tambon_code, sex, age_band, education_level, occupation_code, enrolled_by)
    values (p_project_id, v_code, p_tambon_code, p_sex, p_age_band, p_education, p_occupation, v_uid)
    returning id into v_id;
  else
    v_key := p_project_id::text || ':' || btrim(p_tambon_code::text);
    loop
      v_tries := v_tries + 1;
      if v_tries > 10000 then raise exception 'could not allocate person_code'; end if;
      insert into public.person_code_seq(seq_key, last_seq) values (v_key, 1)
      on conflict (seq_key) do update set last_seq = public.person_code_seq.last_seq + 1
      returning last_seq into v_seq;
      v_gen := btrim(p_tambon_code::text) || '-' || lpad(v_seq::text, 3, '0');
      begin
        insert into public.persons(project_id, person_code, tambon_code, sex, age_band, education_level, occupation_code, enrolled_by)
        values (p_project_id, v_gen, p_tambon_code, p_sex, p_age_band, p_education, p_occupation, v_uid)
        returning id into v_id;
        exit;
      exception when unique_violation then
        -- collided with a pre-existing code -> next number
      end;
    end loop;
    v_code := v_gen;
  end if;

  -- consent recorded on the person row (independent of whether a name is stored)
  update public.persons set consent_version = p_consent_version, consent_at = now() where id = v_id;

  if p_full_name is not null and btrim(p_full_name) <> '' then
    insert into restricted.person_names(person_id, project_id, person_code, enc_name, consent_version, consent_at, created_by)
    values (v_id, p_project_id, v_code, extensions.pgp_sym_encrypt(btrim(p_full_name), restricted._name_key()),
            p_consent_version, now(), v_uid);
  end if;
  return v_id;
end$function$;

-- ── (2) purge_person: COMPLETE erasure (also drop the retained clinical audit + re-id linkage) ──────
-- The AFTER-DELETE audit trigger copies each assessment (raw_answers + indicators) into
-- person_assessment_audit, which the cascade never touches — so "permanent deletion" left the health
-- data behind. Capture the assessment ids first, then remove their audit rows + the re-id log linkage.
create or replace function public.purge_person(p_person_id uuid, p_project_id uuid, p_actor uuid default null::uuid)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public', 'restricted'
as $function$
declare v_code text; v_tambon char(6); v_n int; v_aids uuid[];
begin
  select person_code, tambon_code into v_code, v_tambon
    from public.persons where id = p_person_id and project_id = p_project_id;
  if v_code is null then return false; end if;
  select array_agg(id), count(*) into v_aids, v_n from public.person_assessments where person_id = p_person_id;
  insert into public.person_purge_audit(person_id, project_id, person_code, tambon_code, n_assessments, purged_by)
  values (p_person_id, p_project_id, v_code, v_tambon, v_n, coalesce(auth.uid(), p_actor));
  delete from public.persons where id = p_person_id and project_id = p_project_id;  -- CASCADE: assessments + enc name (fires the audit trigger)
  -- complete the erasure: the audit trigger just re-copied the clinical answers; remove them + the re-id linkage.
  if v_aids is not null then
    delete from public.person_assessment_audit where assessment_id = any(v_aids);
  end if;
  delete from restricted.reidentification_log where person_id = p_person_id;
  return true;
end$function$;

-- ── (3) assess_person_manual: refuse to overwrite a DERIVED (questionnaire) row for the same month ───
-- The manual "backup" form shares the (person_id, year_month) row with the clinical questionnaire; saving
-- it flipped scoring_mode='manual', discarded the derived AAI, and orphaned the tool scores. Block it.
create or replace function public.assess_person_manual(p_person_id uuid, p_year_month text, p_d1 numeric default null::numeric, p_d2 numeric default null::numeric, p_d3 numeric default null::numeric, p_d4 numeric default null::numeric, p_status text default 'submitted'::text, p_actor uuid default null::uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare v_auth uuid := auth.uid(); v_uid uuid := coalesce(auth.uid(), p_actor);
        v_proj uuid; v_id uuid; v_overall numeric;
begin
  select project_id into v_proj from public.persons where id = p_person_id;
  if v_proj is null then raise exception 'person not found'; end if;
  if v_auth is not null and not exists (
      select 1 from public.project_account_registrations r
      where r.project_id = v_proj and r.account_id = v_auth and r.role in ('owner','submitter')
  ) then raise exception 'not authorized to assess for this project'; end if;
  -- do not clobber a questionnaire-derived assessment with the manual backup form
  if exists (select 1 from public.person_assessments
             where person_id = p_person_id and year_month = p_year_month and scoring_mode = 'derived') then
    raise exception 'a questionnaire-derived assessment already exists for this month';
  end if;
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
end$function$;
