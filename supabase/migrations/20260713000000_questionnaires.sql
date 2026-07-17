-- Per-project questionnaire registry + project assignment (Phase 1).
-- Questionnaire schemas (ported NEDP instrument + surveys) are pushed from lib/questionnaire/registry.ts
-- via web_upsert_questionnaire (an admin "sync" action), not seeded inline. Apply BEFORE the deploy.

create table if not exists public.questionnaires (
  id          uuid primary key default gen_random_uuid(),
  code        text not null,               -- 'nedp', 'survey-16'
  version     text not null,               -- 'v1.0'
  title       text not null,
  kind        text not null default 'clinical' check (kind in ('clinical','survey')),
  schema_json jsonb not null,              -- the QuestionnaireSchema (ported V1_SCHEMA shape)
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  text,
  unique (code, version)
);

-- One active questionnaire per project (v1); `modules` selects which sections/tools apply (e.g. {fall}).
create table if not exists public.project_questionnaires (
  project_id       uuid primary key references public.projects(id) on delete cascade,
  questionnaire_id uuid not null references public.questionnaires(id),
  modules          text[] not null default '{}',
  assigned_at      timestamptz not null default now(),
  assigned_by      text
);

alter table public.questionnaires        enable row level security;  -- read via service-role; RPC-only writes
alter table public.project_questionnaires enable row level security;

create or replace function public.web_upsert_questionnaire(
  p_code text, p_version text, p_title text, p_kind text, p_schema jsonb, p_by text default 'system'
) returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare v_id uuid;
begin
  insert into public.questionnaires(code, version, title, kind, schema_json, created_by)
  values (p_code, p_version, p_title, coalesce(p_kind,'clinical'), p_schema, p_by)
  on conflict (code, version) do update
    set title = excluded.title, kind = excluded.kind, schema_json = excluded.schema_json
  returning id into v_id;
  return v_id;
end$function$;

create or replace function public.web_list_questionnaires()
 returns table(id uuid, code text, version text, title text, kind text)
 language sql security definer set search_path to 'public'
as $function$ select id, code, version, title, kind from public.questionnaires where is_active order by title; $function$;

create or replace function public.web_assign_questionnaire(
  p_project uuid, p_questionnaire uuid, p_modules text[] default '{}', p_by text default 'admin'
) returns boolean language plpgsql security definer set search_path to 'public'
as $function$
begin
  insert into public.project_questionnaires(project_id, questionnaire_id, modules, assigned_by)
  values (p_project, p_questionnaire, coalesce(p_modules, '{}'), p_by)
  on conflict (project_id) do update
    set questionnaire_id = excluded.questionnaire_id, modules = excluded.modules,
        assigned_at = now(), assigned_by = excluded.assigned_by;
  return true;
end$function$;

create or replace function public.web_unassign_questionnaire(p_project uuid, p_by text default 'admin')
 returns boolean language plpgsql security definer set search_path to 'public'
as $function$
begin
  delete from public.project_questionnaires where project_id = p_project;
  return true;
end$function$;

revoke all on function public.web_upsert_questionnaire(text,text,text,text,jsonb,text) from public, anon;
revoke all on function public.web_list_questionnaires()                                from public, anon;
revoke all on function public.web_assign_questionnaire(uuid,uuid,text[],text)           from public, anon;
revoke all on function public.web_unassign_questionnaire(uuid,text)                     from public, anon;
-- Admin project-write RPCs are service_role-only (called server-side via the admin routes), matching
-- web_set_project_head. Only the read (web_list) is exposed to authenticated.
grant execute on function public.web_upsert_questionnaire(text,text,text,text,jsonb,text) to service_role;
grant execute on function public.web_list_questionnaires()                                to authenticated, service_role;
grant execute on function public.web_assign_questionnaire(uuid,uuid,text[],text)           to service_role;
grant execute on function public.web_unassign_questionnaire(uuid,text)                     to service_role;
