-- Wave 2 — คำขอแก้ไขข้อมูล approval queue (monthly submissions + project-location list).
--
-- Monthly edit-requests already have a full flow used by Railway's /m/edits:
--   web_list_edit_requests()  → pending monthly edits
--   web_approve_edit(uuid)    → status='draft' + edit_approved_at (unlock); returns requester line_user_id
-- We reuse those and add only a monthly REJECT. Then we add the net-new LOCATION-list edit-request flow
-- (a verified-lock on location_verifications), mirroring the same request→approve/reject shape.

-- 1) Monthly reject (approve already exists) --------------------------------------------------
create or replace function public.web_reject_edit(p_submission uuid)
  returns boolean language plpgsql security definer set search_path to 'public' as $$
declare v_n int;
begin
  update public.location_submissions
     set edit_requested_at = null, edit_requested_by = null, updated_at = now()
   where id = p_submission and edit_approved_at is null;   -- stays 'submitted' (locked); user may re-request
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;

-- 2) Location-list edit-request columns (after ยืนยัน, edits need admin approval) -------------
alter table public.location_verifications
  add column if not exists edit_requested_at timestamptz,
  add column if not exists edit_requested_by text,
  add column if not exists edit_approved_at  timestamptz;

-- 3) User requests to edit a verified location list ------------------------------------------
create or replace function public.web_request_location_edit(p_project uuid, p_by text)
  returns boolean language plpgsql security definer set search_path to 'public' as $$
declare v_n int;
begin
  update public.location_verifications
     set edit_requested_at = now(),
         edit_requested_by  = nullif(trim(coalesce(p_by, '')), ''),
         edit_approved_at   = null
   where project_id = p_project
     and verified_at is not null
     and edit_approved_at is null;
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;

-- 4) Re-verifying re-locks: clear any approved/pending edit window on (re)verify --------------
create or replace function public.web_verify_locations(p_project uuid, p_by text, p_account uuid default null::uuid)
  returns void language plpgsql as $$
declare v_src int;
begin
  insert into public.location_verifications (project_id, verified_by, verified_by_name, verified_at,
                                             edit_requested_at, edit_requested_by, edit_approved_at)
  values (p_project, p_account, nullif(trim(p_by), ''), now(), null, null, null)
  on conflict (project_id) do update
    set verified_by = excluded.verified_by,
        verified_by_name = excluded.verified_by_name,
        verified_at = excluded.verified_at,
        edit_requested_at = null,
        edit_requested_by = null,
        edit_approved_at = null;
  select source_project_id into v_src from public.projects where id = p_project;
  if v_src is not null then
    update public.monitor_projects
       set location_verified_at = now(),
           location_verified_by = coalesce(nullif(trim(p_by), ''), 'ผู้รับผิดชอบโครงการ')
     where project_id = v_src;
  end if;
  insert into public.location_audit_log(project_id, monitor_project_id, action, changed_by)
  values (p_project, v_src, 'verify', nullif(trim(p_by), ''));
end $$;

-- 5) Admin: list / approve / reject pending location-list edit-requests -----------------------
create or replace function public.web_list_location_edit_requests()
  returns table(project_id uuid, source_project_id integer, project_name text,
                requested_by text, requested_at timestamptz)
  language sql security definer set search_path to 'public' as $$
  select lv.project_id, p.source_project_id, p.name::text,
         coalesce(lv.edit_requested_by, '')::text, lv.edit_requested_at
    from public.location_verifications lv
    join public.projects p on p.id = lv.project_id
   where lv.edit_requested_at is not null and lv.edit_approved_at is null
   order by lv.edit_requested_at desc;
$$;

create or replace function public.web_approve_location_edit(p_project uuid)
  returns boolean language plpgsql security definer set search_path to 'public' as $$
declare v_n int;
begin
  update public.location_verifications
     set edit_approved_at = now()                          -- unlocks re-edit / re-verify
   where project_id = p_project and edit_requested_at is not null and edit_approved_at is null;
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;

create or replace function public.web_reject_location_edit(p_project uuid)
  returns boolean language plpgsql security definer set search_path to 'public' as $$
declare v_n int;
begin
  update public.location_verifications
     set edit_requested_at = null, edit_requested_by = null
   where project_id = p_project and edit_approved_at is null;
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;

grant execute on function public.web_reject_edit(uuid) to anon, authenticated, service_role;
grant execute on function public.web_request_location_edit(uuid, text) to anon, authenticated, service_role;
grant execute on function public.web_list_location_edit_requests() to anon, authenticated, service_role;
grant execute on function public.web_approve_location_edit(uuid) to anon, authenticated, service_role;
grant execute on function public.web_reject_location_edit(uuid) to anon, authenticated, service_role;
