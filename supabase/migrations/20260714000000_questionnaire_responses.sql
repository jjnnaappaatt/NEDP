-- Clinical questionnaire storage (Phase 3): full per-question answers + per-tool scores on the existing
-- person_assessments row. The AAI trigger stays the sole owner of AAI derivation (fed via raw_answers).
-- Apply BEFORE the deploy; additive (assess_person is left intact).

alter table public.person_assessments
  add column if not exists questionnaire_id uuid references public.questionnaires(id),
  add column if not exists q_answers jsonb not null default '{}'::jsonb;  -- keyed by question_id (G.*, F.*, …)

create table if not exists public.person_tool_scores (
  id                   uuid primary key default gen_random_uuid(),
  person_assessment_id uuid not null references public.person_assessments(id) on delete cascade,
  tool_code            text not null,
  project_module       text not null,   -- general|fall|bmd|nutrition|survey
  raw_score            numeric(6,1),
  score_label          text,
  risk_level           text not null default 'normal' check (risk_level in ('normal','medium','high')),
  flag                 boolean not null default false,
  created_at           timestamptz not null default now(),
  unique (person_assessment_id, tool_code)
);
create index if not exists idx_pts_assessment on public.person_tool_scores(person_assessment_id);
alter table public.person_tool_scores enable row level security;

-- Superset of assess_person: writes raw_answers (→ AAI trigger) + questionnaire_id/q_answers, and
-- replaces the person_tool_scores rows. Resolves pre_assessment_id for 'post' rounds.
create or replace function public.assess_person_clinical(
  p_person_id uuid, p_round text, p_year_month text, p_questionnaire_id uuid,
  p_q_answers jsonb, p_raw_answers jsonb, p_tool_scores jsonb,
  p_status text default 'submitted', p_actor uuid default null
) returns jsonb language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
declare v_auth uuid := auth.uid(); v_uid uuid := coalesce(auth.uid(), p_actor);
        v_proj uuid; v_id uuid; v_overall numeric; v_flag boolean; v_pre uuid;
begin
  select project_id into v_proj from public.persons where id = p_person_id;
  if v_proj is null then raise exception 'person not found'; end if;
  if v_auth is not null and not exists (
      select 1 from public.project_account_registrations r
      where r.project_id = v_proj and r.account_id = v_auth and r.role in ('owner','submitter')
  ) then raise exception 'not authorized to assess for this project'; end if;

  if coalesce(p_round,'pre') = 'post' then
    select id into v_pre from public.person_assessments
      where person_id = p_person_id and round = 'pre' and status in ('submitted','approved')
      order by created_at desc limit 1;
  end if;

  insert into public.person_assessments(
      person_id, round, year_month, raw_answers, status, assessor_account_id, scoring_mode,
      questionnaire_id, q_answers, pre_assessment_id)
  values (p_person_id, coalesce(p_round,'pre'), p_year_month, coalesce(p_raw_answers,'{}'::jsonb),
          coalesce(p_status,'submitted'), v_uid, 'derived',
          p_questionnaire_id, coalesce(p_q_answers,'{}'::jsonb), v_pre)
  on conflict (person_id, year_month) do update
    set raw_answers = excluded.raw_answers, round = excluded.round, status = excluded.status,
        scoring_mode = 'derived', questionnaire_id = excluded.questionnaire_id,
        q_answers = excluded.q_answers, pre_assessment_id = coalesce(excluded.pre_assessment_id, public.person_assessments.pre_assessment_id),
        assessor_account_id = coalesce(excluded.assessor_account_id, public.person_assessments.assessor_account_id),
        updated_at = now()
  returning id, aai_overall, has_clinical_flag into v_id, v_overall, v_flag;

  delete from public.person_tool_scores where person_assessment_id = v_id;
  insert into public.person_tool_scores(person_assessment_id, tool_code, project_module, raw_score, score_label, risk_level, flag)
  select v_id, e->>'tool_code', e->>'project_module',
         nullif(e->>'raw_score','')::numeric, e->>'score_label',
         coalesce(e->>'risk_level','normal'), coalesce((e->>'flag')::boolean, false)
  from jsonb_array_elements(coalesce(p_tool_scores, '[]'::jsonb)) e
  where e->>'tool_code' is not null;

  return jsonb_build_object('assessment_id', v_id, 'aai_overall', v_overall, 'has_clinical_flag', v_flag);
end$function$;
revoke all on function public.assess_person_clinical(uuid,text,text,uuid,jsonb,jsonb,jsonb,text,uuid) from public, anon;
grant execute on function public.assess_person_clinical(uuid,text,text,uuid,jsonb,jsonb,jsonb,text,uuid) to authenticated, service_role;
