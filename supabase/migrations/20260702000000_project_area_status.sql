-- ============================================================================
-- Project-scoped per-tambon completion counts for the ส่งข้อมูล → รายบุคคล folder tree.
-- A person is "complete" when they have a submitted/approved assessment with all four
-- domains filled. The folder colours derive from these counts (white = n_enrolled 0,
-- green = n_complete = n_enrolled, yellow otherwise), rolled up amphoe→province in TS.
-- Returns de-identified counts only.
-- ============================================================================
create or replace function public.get_project_tambon_status(p_project_id uuid)
returns table (tambon_code char(6), n_enrolled bigint, n_complete bigint)
language sql stable security definer set search_path = public as $$
  with pp as (
    select id, tambon_code from public.persons
    where project_id = p_project_id and is_active
  ),
  c as (
    select pp.id, pp.tambon_code,
      exists(
        select 1 from public.person_assessments a
        where a.person_id = pp.id and a.status in ('submitted','approved')
          and a.aai_d1 is not null and a.aai_d2 is not null
          and a.aai_d3 is not null and a.aai_d4 is not null
      ) as complete
    from pp
  )
  select c.tambon_code, count(*)::bigint, count(*) filter (where c.complete)::bigint
  from c where c.tambon_code is not null
  group by c.tambon_code;
$$;
revoke all on function public.get_project_tambon_status(uuid) from public, anon;
grant execute on function public.get_project_tambon_status(uuid) to authenticated, service_role;
