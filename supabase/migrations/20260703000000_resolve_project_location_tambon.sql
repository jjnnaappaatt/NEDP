-- ============================================================================
-- Auto-resolve project_locations.tambon_code from the free-text จังหวัด/อำเภอ/ตำบล on
-- every write. Without this, the xlsx/location-manager save path inserts province/amphoe/
-- tambon TEXT but no tambon_code, so updated locations stay "unmapped" and never appear in
-- the ส่งข้อมูล→รายบุคคล folder tree. The trigger matches the exact (province_th, amphoe_th,
-- tambon_th) triple in geo_tambon (province alias-normalized) and only sets the code on a
-- UNIQUE match — never guesses. Genuine typos/junk stay unmapped (correct).
-- ============================================================================
create or replace function public.fn_resolve_project_location_tambon()
returns trigger language plpgsql set search_path = public as $$
declare v_prov text; v_n int; v_code char(6);
begin
  -- if the free-text location changed on UPDATE, force a re-resolve (clear stale code)
  if TG_OP = 'UPDATE'
     and (NEW.province is distinct from OLD.province
       or NEW.amphoe   is distinct from OLD.amphoe
       or NEW.tambon   is distinct from OLD.tambon) then
    NEW.tambon_code := null;
  end if;
  if NEW.tambon_code is not null then return NEW; end if;  -- already mapped (or explicitly set)

  v_prov := case btrim(coalesce(NEW.province,''))
              when 'กรุงเทพ' then 'กรุงเทพมหานคร'
              when 'อยุธยา'  then 'พระนครศรีอยุธยา'
              else btrim(coalesce(NEW.province,'')) end;
  select count(*), min(g.tambon_code) into v_n, v_code
  from public.geo_tambon g
  where g.province_th = v_prov
    and g.amphoe_th  = btrim(coalesce(NEW.amphoe,''))
    and g.tambon_th  = btrim(coalesce(NEW.tambon,''));
  if v_n = 1 then NEW.tambon_code := v_code; end if;
  return NEW;
end$$;

drop trigger if exists trg_resolve_pl_tambon on public.project_locations;
create trigger trg_resolve_pl_tambon
  before insert or update on public.project_locations
  for each row execute function public.fn_resolve_project_location_tambon();
