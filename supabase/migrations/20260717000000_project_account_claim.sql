-- Project-account claim + account merge (B2: "register-before-link" reconnect).
--
-- WHY: each project was seeded with a placeholder `accounts` row (source_kind='project') carrying the
-- researcher's name/org/phone + one project_account_registrations row, but NO line_user_id — so when the
-- researcher logs in via LINE they get a fresh, empty line account instead of "their" project account.
-- This adds an admin-vouched claim: the admin mints a signed link for a placeholder account (see
-- lib/claim-auth.ts), the researcher opens it + logs in with LINE, and web_claim_project_account binds
-- their verified LINE identity to that placeholder (folding in any duplicate line account they already
-- made). Web writes run under service-role (auth.uid() is NULL) so every function takes p_actor and
-- attributes with coalesce(auth.uid(), p_actor); authorization is enforced app-side (admin-gated mint +
-- verified LINE token on claim), never in-RPC.
--
-- APPLY: any time (idempotent create-or-replace; no schema/data change until the functions are CALLED).
-- REVERSIBLE: drop the two functions.

-- ── 1. web_merge_accounts — fold every reference from a duplicate account into a survivor, then delete it
-- Re-points all 16 FK columns + 5 non-FK account columns that reference accounts(id) in this DB (list
-- derived from pg_constraint + information_schema against prod). Dedups on the three unique keys that
-- include an account column (project_account_registrations, location_submissions, account_follows PK) so
-- the re-point can't raise a unique violation.
create or replace function public.web_merge_accounts(
  p_from uuid, p_to uuid, p_actor uuid default null
) returns void
  language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
begin
  if p_from is null or p_to is null or p_from = p_to then return; end if;
  if not exists (select 1 from accounts where id = p_from) then return; end if;
  if not exists (select 1 from accounts where id = p_to) then
    raise exception 'web_merge_accounts: survivor % does not exist', p_to;
  end if;

  -- project_account_registrations — unique(project_id, account_id): drop p_from rows that would collide.
  delete from project_account_registrations r
    where r.account_id = p_from
      and exists (select 1 from project_account_registrations r2
                  where r2.account_id = p_to and r2.project_id = r.project_id);
  update project_account_registrations set account_id = p_to where account_id = p_from;
  update project_account_registrations set registered_by = p_to where registered_by = p_from;

  -- location_submissions — unique(location_id, account_id, year_month): drop collisions, then re-point.
  delete from location_submissions s
    where s.account_id = p_from
      and exists (select 1 from location_submissions s2
                  where s2.account_id = p_to and s2.location_id = s.location_id
                    and s2.year_month = s.year_month);
  update location_submissions set account_id = p_to where account_id = p_from;
  update location_submissions set created_by = p_to where created_by = p_from;
  update location_submissions set updated_by = p_to where updated_by = p_from;

  -- account_follows — pk(follower_id, following_id): drop self-follows + dups the merge would create.
  delete from account_follows f
    where f.follower_id = p_from
      and (f.following_id = p_to
           or exists (select 1 from account_follows f2 where f2.follower_id = p_to and f2.following_id = f.following_id));
  update account_follows set follower_id = p_to where follower_id = p_from;
  delete from account_follows f
    where f.following_id = p_from
      and (f.follower_id = p_to
           or exists (select 1 from account_follows f2 where f2.following_id = p_to and f2.follower_id = f.follower_id));
  update account_follows set following_id = p_to where following_id = p_from;

  -- remaining columns have no account-scoped unique key → straight re-point (pk is a surrogate id).
  update location_verifications        set verified_by       = p_to where verified_by       = p_from;
  update project_locations             set created_by        = p_to where created_by        = p_from;
  update project_locations             set updated_by        = p_to where updated_by        = p_from;
  update monthly_rankings              set account_id        = p_to where account_id        = p_from;
  update point_events                  set account_id        = p_to where account_id        = p_from;
  update issue_reports                 set reporter_account_id = p_to where reporter_account_id = p_from;
  update monitor_issues                set reporter_account_id = p_to where reporter_account_id = p_from;
  update project_head_requests         set account_id        = p_to where account_id        = p_from;
  update project_integration_requests  set account_id        = p_to where account_id        = p_from;
  update project_questionnaire_requests set account_id       = p_to where account_id        = p_from;
  update person_assessments            set assessor_account_id = p_to where assessor_account_id = p_from;
  -- note: person_assessment_points is a VIEW over person_assessments (updated above) — do NOT touch it.
  update projects                      set head_account_id   = p_to where head_account_id   = p_from;
  update projects                      set avatar_account_id = p_to where avatar_account_id = p_from;

  delete from accounts where id = p_from;
end;
$function$;

revoke all on function public.web_merge_accounts(uuid, uuid, uuid) from public, anon;
grant execute on function public.web_merge_accounts(uuid, uuid, uuid) to service_role;

-- ── 2. web_claim_project_account — bind a verified LINE identity to a placeholder account
-- Returns jsonb { ok, account_id, merged, already }. account_id is the SURVIVING account the caller
-- should set the session cookie for.
create or replace function public.web_claim_project_account(
  p_account uuid, p_line_user_id text, p_picture text default null, p_actor uuid default null
) returns jsonb
  language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
declare
  v_line text; v_name text; v_org text; v_phone text; v_spid int;
  v_dup uuid;
begin
  if p_account is null or coalesce(trim(p_line_user_id), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'missing args');
  end if;

  select line_user_id, name, org, phone, source_project_id
    into v_line, v_name, v_org, v_phone, v_spid
    from accounts where id = p_account;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'account not found');
  end if;

  -- Already linked?
  if v_line is not null then
    if v_line = p_line_user_id then
      return jsonb_build_object('ok', true, 'account_id', p_account, 'already', true);
    end if;
    return jsonb_build_object('ok', false, 'error', 'account already linked to a different LINE user');
  end if;

  -- Does this LINE user already have an account (a duplicate made by an earlier standalone login)?
  select id into v_dup from accounts where line_user_id = p_line_user_id and id <> p_account limit 1;

  if v_dup is null then
    -- Case A — no duplicate: bind the LINE identity onto the placeholder; it becomes the real account.
    update accounts
       set line_user_id = p_line_user_id,
           picture_url  = coalesce(p_picture, picture_url),
           source_kind  = 'line'
     where id = p_account;
    perform public.web_sync_line_registrations(p_line_user_id); -- surface any bot subscriptions too
    return jsonb_build_object('ok', true, 'account_id', p_account, 'merged', false);
  end if;

  -- Case B — the researcher already has a line account: fold the placeholder (its registration +
  -- researcher name/org/phone) INTO that real account, keeping the LINE identity where it already lives.
  perform public.web_merge_accounts(p_account, v_dup, p_actor);
  update accounts
     set name              = coalesce(nullif(v_name, ''), name),
         org               = coalesce(nullif(v_org, ''), org),
         phone             = coalesce(phone, v_phone),
         source_project_id = coalesce(source_project_id, v_spid),
         picture_url       = coalesce(p_picture, picture_url)
   where id = v_dup;
  perform public.web_sync_line_registrations(p_line_user_id);
  return jsonb_build_object('ok', true, 'account_id', v_dup, 'merged', true);
end;
$function$;

revoke all on function public.web_claim_project_account(uuid, text, text, uuid) from public, anon;
grant execute on function public.web_claim_project_account(uuid, text, text, uuid) to service_role;
