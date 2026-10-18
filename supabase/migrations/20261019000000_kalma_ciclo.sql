-- ============================================================================
-- Kalma · ciclo menstrual opcional.
-- La preferencia vive en el perfil (la tabla ya tiene RLS: cada persona solo ve y cambia el suyo).
-- Los días de periodo se guardan como eventos `menstrual` en la tabla events, que ya existe.
-- ============================================================================

alter table public.profiles
  add column if not exists tracks_cycle boolean not null default false;
