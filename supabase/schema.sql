-- ============================================================================
-- NEDP — Supabase schema (Phase 2). Apply in the Supabase SQL editor.
-- One shared Postgres for BOTH the Next.js web app (anon/auth key, RLS enforced)
-- and the FastAPI LINE bot (service-role / direct connection, bypasses RLS).
-- Mirrors the Phase-1 mock model in lib/mock/data.ts, incl. per-location entry +
-- audited location verification.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── Accounts (LINE Login is the primary identity) ───────────────────────────
create table if not exists accounts (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  org           text,
  avatar_color  text not null default '#1a56db',
  email         text,
  line_user_id  text unique,                 -- links the LINE bot user ↔ web account
  created_at    timestamptz not null default now()
);

create table if not exists projects (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  org           text not null,
  researcher    text,
  deadline_day  int  not null default 25,
  accent        text not null default '#1a56db',
  active        boolean not null default true
);

-- ── Field-deployment locations (พื้นที่ลงพื้นที่) + audited verification ──────
create table if not exists project_locations (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  province    text not null,
  amphoe      text not null,
  tambon      text not null,
  seq         int,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references accounts(id),
  updated_by  uuid references accounts(id)
);

create table if not exists location_verifications (
  project_id   uuid primary key references projects(id) on delete cascade,
  verified_by  uuid references accounts(id),
  verified_by_name text,
  verified_at  timestamptz not null default now()
);

-- ── Multi-account-per-project + roles (spec §5.3) ───────────────────────────
create table if not exists project_account_registrations (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  account_id     uuid not null references accounts(id) on delete cascade,
  role           text not null default 'submitter' check (role in ('owner','submitter','viewer')),
  registered_at  timestamptz not null default now(),
  registered_by  uuid references accounts(id),
  unique (project_id, account_id)
);

-- ── Submissions: per-location, per month (project "done" only when all done) ─
create table if not exists location_submissions (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,
  location_id   uuid not null references project_locations(id) on delete cascade,
  account_id    uuid not null references accounts(id),
  year_month    text not null,                       -- 'YYYY-MM'
  status        text not null default 'draft' check (status in ('draft','submitted','approved','rejected')),
  data          jsonb not null default '{}'::jsonb,
  completion_pct int not null default 0,
  submitted_at  timestamptz,
  created_at    timestamptz not null default now(),
  created_by    uuid references accounts(id),
  updated_at    timestamptz not null default now(),
  updated_by    uuid references accounts(id),
  -- duplicate-submission guard (spec §5.3): one row per (location, account, month)
  unique (location_id, account_id, year_month)
);

-- ── Gamification (spec §2) ──────────────────────────────────────────────────
create table if not exists point_events (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  year_month  text not null,
  event_type  text not null check (event_type in ('early','ontime','complete','late','edit_penalty')),
  points      int  not null,
  created_at  timestamptz not null default now()
);

create table if not exists monthly_rankings (
  id            uuid primary key default gen_random_uuid(),
  year_month    text not null,
  rank          int  not null,
  account_id    uuid references accounts(id),
  project_id    uuid references projects(id),
  total_points  int  not null,
  submitted_at  timestamptz,
  snapshot_at   timestamptz not null default now()
);

create table if not exists account_follows (
  follower_id   uuid not null references accounts(id) on delete cascade,
  following_id  uuid not null references accounts(id) on delete cascade,
  followed_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists issue_reports (
  id                  uuid primary key default gen_random_uuid(),
  reporter_account_id uuid references accounts(id),
  type                text not null,
  description         text not null,
  attachments         jsonb default '[]'::jsonb,
  status              text not null default 'open' check (status in ('open','in_progress','resolved')),
  ticket              text not null,
  created_at          timestamptz not null default now()
);

create table if not exists project_templates (
  project_id  uuid primary key references projects(id) on delete cascade,
  sections    jsonb not null default '[]'::jsonb,
  fields      jsonb not null default '[]'::jsonb
);

-- ── Audit log: before/after JSON on every submission mutation (spec §0/§5.3) ─
create table if not exists submission_audit_log (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid,
  action        text not null,       -- insert | update | delete
  before_data   jsonb,
  after_data    jsonb,
  changed_by    uuid,
  changed_at    timestamptz not null default now()
);

create or replace function fn_audit_submission() returns trigger as $$
begin
  insert into submission_audit_log(submission_id, action, before_data, after_data, changed_by)
  values (coalesce(new.id, old.id), lower(tg_op),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end,
          case when tg_op <> 'DELETE' then new.updated_by else old.updated_by end);
  return coalesce(new, old);
end; $$ language plpgsql;

drop trigger if exists trg_audit_location_submissions on location_submissions;
create trigger trg_audit_location_submissions
  after insert or update or delete on location_submissions
  for each row execute function fn_audit_submission();

-- ── Standings (point engine, spec §2.1) as a callable function ──────────────
-- Ranks the month's submissions per (account, project) by points desc, then earliest submit.
create or replace function compute_standings(p_month text)
returns table (rank bigint, account_id uuid, project_id uuid, total_points int, submitted_at timestamptz)
as $$
  select row_number() over (order by sum(points) desc, min(pe.created_at) asc) as rank,
         pe.account_id, pe.project_id, sum(pe.points)::int as total_points, min(pe.created_at) as submitted_at
  from point_events pe
  where pe.year_month = p_month
  group by pe.account_id, pe.project_id
  order by total_points desc, submitted_at asc;
$$ language sql stable;

-- ── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists idx_loc_sub_month   on location_submissions(year_month);
create index if not exists idx_point_month      on point_events(year_month);
create index if not exists idx_reg_account      on project_account_registrations(account_id);
create index if not exists idx_loc_project      on project_locations(project_id);

-- ── Row-Level Security (spec §5.3 guards). FastAPI uses service-role (bypasses). ─
alter table location_submissions enable row level security;
alter table project_account_registrations enable row level security;

-- read: any registered member of the project may read its submissions
create policy loc_sub_read on location_submissions for select
  using (exists (select 1 from project_account_registrations r
                 where r.project_id = location_submissions.project_id
                   and r.account_id = auth.uid()));

-- write: only owner/submitter may insert/update; viewer is read-only; lock after 'submitted'
create policy loc_sub_write on location_submissions for all
  using (exists (select 1 from project_account_registrations r
                 where r.project_id = location_submissions.project_id
                   and r.account_id = auth.uid()
                   and r.role in ('owner','submitter')))
  with check (exists (select 1 from project_account_registrations r
                 where r.project_id = location_submissions.project_id
                   and r.account_id = auth.uid()
                   and r.role in ('owner','submitter')));

-- NOTE: the "lock after submitted (only owner can unlock via ขอแก้ไข)" and the
-- conflict-presence guard are enforced at the app/RPC layer + Realtime presence.
