-- Distinct provinces from geo_tambon. getProvinces() previously did a plain select over geo_tambon
-- (7,436 rows) which PostgREST truncates at the default 1000-row cap → only ~10 provinces surfaced.
-- This SECURITY DEFINER function returns the full distinct set (77) regardless of any row cap.
create or replace function public.geo_provinces()
returns table(province_code text, province_th text)
language sql stable security definer set search_path = public as $$
  select distinct province_code::text, province_th
  from public.geo_tambon
  order by province_th
$$;

grant execute on function public.geo_provinces() to anon, authenticated, service_role;
