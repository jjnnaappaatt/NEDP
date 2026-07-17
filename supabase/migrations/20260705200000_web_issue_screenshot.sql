-- Web รายงานปัญหา now writes to monitor_issues (same table admin reads) + can attach a screenshot.
alter table public.monitor_issues add column if not exists screenshot_url text;

-- Private bucket for issue screenshots (may contain PII → never public; all access via service-role + signed URLs).
insert into storage.buckets (id, name, public)
values ('issue-screenshots', 'issue-screenshots', false)
on conflict (id) do nothing;
