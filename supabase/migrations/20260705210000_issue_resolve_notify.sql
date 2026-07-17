-- Notify the reporter when an issue is resolved: link a report to its reporter account (drives the in-app
-- bell for that account) and stamp when it was resolved (the bell's 14-day window). Both nullable, no FK —
-- keeps the monitor_* tables decoupled, matching the plain line_user_id text column already there.
alter table public.monitor_issues add column if not exists reporter_account_id uuid;
alter table public.monitor_issues add column if not exists resolved_at timestamptz;
