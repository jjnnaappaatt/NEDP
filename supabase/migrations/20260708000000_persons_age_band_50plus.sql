-- Extend the elderly age range down to 50: add the '50-54' band to public.persons.age_band.
-- Widening the allowed set only — no existing row can violate it (old set is a subset).
alter table public.persons drop constraint if exists persons_age_band_check;
alter table public.persons add constraint persons_age_band_check
  check (age_band in ('50-54','55-59','60-64','65-69','70-74','75+'));
