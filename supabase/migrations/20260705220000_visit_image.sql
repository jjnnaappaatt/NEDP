-- Attach an image to a ลงพื้นที่ (site-visit) invite and send it as the LINE Flex hero.
alter table public.monitor_site_visits add column if not exists image_url text;

-- PUBLIC bucket: LINE's servers must fetch the image URL, and visit posters are broadcast to many recipients
-- anyway (not PII like issue-screenshots). Kept separate from the private screenshots bucket.
insert into storage.buckets (id, name, public)
values ('visit-invite-images', 'visit-invite-images', true)
on conflict (id) do nothing;
