-- Admin-configurable daily send hour for the NEDP LINE reminders.
--
-- monitor_settings is the singleton row (id=1) the reminder passes read (lib/line/reminders.ts).
-- send_hour is the Bangkok hour (0–23) the cron route gates delivery on, so the admin can pick the
-- time of day from /admin/settings instead of it being baked into the cron schedule.
--
-- Default 9 preserves today's ~09:00 behavior for the existing row (Postgres backfills the NOT NULL
-- default on ALTER). Apply this BEFORE deploying the code that selects send_hour.

alter table public.monitor_settings
  add column if not exists send_hour int not null default 9;

alter table public.monitor_settings
  drop constraint if exists monitor_settings_send_hour_range;
alter table public.monitor_settings
  add constraint monitor_settings_send_hour_range check (send_hour between 0 and 23);
