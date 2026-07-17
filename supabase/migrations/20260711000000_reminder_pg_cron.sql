-- Drive the NEDP reminder cron from Supabase pg_cron instead of a Vercel cron.
--
-- Why: the send time is now admin-configurable (monitor_settings.send_hour), which requires checking
-- hourly and firing only in the configured hour. Vercel's free Hobby plan forbids sub-daily cron
-- (an hourly expression fails at deploy), so we schedule the hourly ping in Postgres — plan-agnostic,
-- and pg_cron already runs on this project. The endpoint (/api/cron/reminders) is gated in code to
-- send_hour, so pinging it every hour delivers exactly once/day at that hour (idempotent per month).
--
-- Auth: the endpoint checks `Authorization: Bearer $CRON_SECRET`. The token is read from Supabase Vault
-- (secret name 'cron_secret') at run time, so it is never stored in cron.job.command in plaintext.
--
-- PREREQUISITE: add the app's CRON_SECRET value to Vault as 'cron_secret' (Supabase dashboard → Vault)
-- BEFORE applying, and deploy the send-hour-gated code first so the hourly ping isn't un-gated spam.

create extension if not exists pg_net;

-- cron.schedule upserts by job name, so re-applying this migration is idempotent.
-- timeout_milliseconds is raised to 60s: the once-a-day active run (all projects × LINE pushes) can
-- exceed pg_net's 5s default, and we want pg_net to hold the connection until the pass finishes rather
-- than risk the function being cut off / the response going unrecorded.
select cron.schedule('nedp-reminders-hourly', '0 * * * *', $job$
  select net.http_get(
    url := 'https://<your-app-domain>/api/cron/reminders',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    timeout_milliseconds := 60000
  );
$job$);
