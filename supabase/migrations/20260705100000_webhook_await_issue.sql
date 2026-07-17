-- Wave 4: serverless-safe replacement for the bot's in-memory _AWAITING_ISSUE dict.
-- When a user types แจ้งปัญหา, mark their chat as awaiting an issue description (15-min TTL);
-- the next non-command message becomes a monitor_issues row.
create table if not exists public.webhook_await_issue (
  chat_id    text primary key,
  expires_at timestamptz not null
);
alter table public.webhook_await_issue enable row level security;
-- service_role (the app's supabaseAdmin client) bypasses RLS; no policies = denied to anon/authenticated.
