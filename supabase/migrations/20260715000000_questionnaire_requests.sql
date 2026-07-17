-- Head-initiated "request add questionnaire" → admin approve. Mirrors project_integration_requests;
-- the head submits their questionnaire JSON, admin approves → surveyToSchema + upsert + assign (in the
-- data layer). Apply BEFORE the deploy; additive.

create table if not exists public.project_questionnaire_requests (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  account_id     uuid,
  requester_name text,
  title          text not null,
  include_aai    boolean not null default true,
  payload        jsonb not null,                -- the raw survey JSON the head submitted
  status         text not null default 'pending' check (status in ('pending','approved','rejected')),
  note           text,
  requested_at   timestamptz not null default now(),
  decided_at     timestamptz,
  decided_by     text
);
create unique index if not exists uq_pqr_one_pending on public.project_questionnaire_requests(project_id) where status = 'pending';
create index if not exists idx_pqr_status on public.project_questionnaire_requests(status);
alter table public.project_questionnaire_requests enable row level security;  -- RPC-only; direct access denied

create or replace function public.web_request_questionnaire(
  p_project uuid, p_title text, p_include_aai boolean, p_payload jsonb, p_actor uuid default null, p_note text default null
) returns text language plpgsql security definer set search_path to 'public'
as $function$
declare v_uid uuid := coalesce(auth.uid(), p_actor); v_name text;
begin
  if not exists (select 1 from public.projects where id = p_project) then return 'no_project'; end if;
  if exists (select 1 from public.project_questionnaire_requests where project_id = p_project and status = 'pending')
    then return 'exists'; end if;
  select name into v_name from public.accounts where id = v_uid;
  insert into public.project_questionnaire_requests(project_id, account_id, requester_name, title, include_aai, payload, note)
  values (p_project, v_uid, v_name, p_title, coalesce(p_include_aai, true), p_payload, p_note);
  return 'ok';
end$function$;

create or replace function public.web_list_questionnaire_requests()
 returns table(request_id uuid, project_id uuid, source_project_id integer, project_name text,
               requester_name text, title text, include_aai boolean, payload jsonb, requested_at timestamptz)
 language sql security definer set search_path to 'public'
as $function$
  select r.id, r.project_id, p.source_project_id, p.name, r.requester_name, r.title, r.include_aai, r.payload, r.requested_at
  from public.project_questionnaire_requests r
  join public.projects p on p.id = r.project_id
  where r.status = 'pending'
  order by r.requested_at asc;
$function$;

create or replace function public.web_get_questionnaire_request(p_request_id uuid)
 returns table(project_id uuid, title text, include_aai boolean, payload jsonb, status text)
 language sql security definer set search_path to 'public'
as $function$
  select project_id, title, include_aai, payload, status
  from public.project_questionnaire_requests where id = p_request_id;
$function$;

create or replace function public.web_decide_questionnaire_request(p_request_id uuid, p_status text, p_by text default 'admin')
 returns boolean language plpgsql security definer set search_path to 'public'
as $function$
declare n int;
begin
  if p_status not in ('approved','rejected') then return false; end if;
  update public.project_questionnaire_requests
    set status = p_status, decided_at = now(), decided_by = p_by
    where id = p_request_id and status = 'pending';
  get diagnostics n = row_count;
  return n > 0;
end$function$;

revoke all on function public.web_request_questionnaire(uuid,text,boolean,jsonb,uuid,text) from public, anon;
revoke all on function public.web_list_questionnaire_requests()                             from public, anon;
revoke all on function public.web_get_questionnaire_request(uuid)                            from public, anon;
revoke all on function public.web_decide_questionnaire_request(uuid,text,text)               from public, anon;
grant execute on function public.web_request_questionnaire(uuid,text,boolean,jsonb,uuid,text) to authenticated, service_role;
grant execute on function public.web_list_questionnaire_requests()                             to service_role;
grant execute on function public.web_get_questionnaire_request(uuid)                            to service_role;
grant execute on function public.web_decide_questionnaire_request(uuid,text,text)               to service_role;
