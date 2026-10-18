-- ============================================================================
-- Kalma · esquema inicial
-- Cada tabla pertenece a un usuario (user_id → auth.users, on delete cascade) y tiene
-- RLS activado con políticas de select/insert/update/delete donde user_id = auth.uid().
-- Eliminar la cuenta en Auth borra todos sus datos por cascade.
-- ============================================================================

-- ---------- perfiles ----------
create table public.profiles (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  name              text not null default '',
  goals             text[] not null default '{}',
  reminder_time     text not null default '21:00' check (reminder_time ~ '^\d{2}:\d{2}$'),
  caregiver_enabled boolean not null default false,
  caregiver_name    text,
  onboarded         boolean not null default false,
  updated_at        timestamptz not null default now()
);

-- ---------- consentimientos (Ley 1581 de 2012: previo, expreso e informado) ----------
create table public.consents (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  health     boolean not null default false,
  ai         boolean not null default false,
  location   boolean not null default false,
  -- cuándo se dio o revocó cada uno: { "health": "2026-10-17T…", … }
  changed_at jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- condiciones que la persona quiere entender ----------
create table public.conditions (
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, name)
);

-- ---------- medicamentos habituales (solo para registrar más rápido) ----------
create table public.medications (
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  generic_name text,
  use          text not null default 'rescue' check (use in ('rescue', 'preventive', 'other')),
  created_at   timestamptz not null default now(),
  primary key (user_id, name)
);

-- ---------- registros (lo que la persona dijo, escribió o fotografió) ----------
create table public.entries (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  recorded_at timestamptz not null,
  source      text not null check (source in ('voice', 'text', 'photo', 'checkin', 'seed')),
  transcript  text not null default '',
  summary     text not null default '',
  created_at  timestamptz not null default now()
);
create index entries_user_recorded_idx on public.entries (user_id, recorded_at);

-- ---------- eventos extraídos (mismo contrato que extractEntry: data en jsonb) ----------
create table public.events (
  id                    text primary key,
  user_id               uuid not null references auth.users (id) on delete cascade,
  entry_id              text not null references public.entries (id) on delete cascade,
  type                  text not null check (type in ('symptom', 'food', 'drink', 'medication', 'sleep', 'activity', 'mood', 'stress', 'menstrual', 'bowel', 'water', 'note')),
  occurred_at           timestamptz,
  occurred_at_precision text not null check (occurred_at_precision in ('exact', 'approximate', 'part_of_day', 'unknown')),
  confidence            real not null check (confidence between 0 and 1),
  source_text           text not null default '',
  data                  jsonb not null,
  edited                boolean not null default false
);
create index events_user_occurred_idx on public.events (user_id, occurred_at);
create index events_entry_idx on public.events (entry_id);

-- ---------- contexto diario (resumen del check-in nocturno) ----------
create table public.daily_context (
  user_id       uuid not null references auth.users (id) on delete cascade,
  day           date not null,
  sleep_hours   real,
  stress        smallint check (stress between 0 and 10),
  mood          smallint check (mood between 0 and 10),
  water_glasses smallint check (water_glasses >= 0),
  checkin_done  boolean not null default false,
  primary key (user_id, day)
);

-- ---------- preferencias sobre patrones (los patrones se calculan en el celular) ----------
create table public.pattern_flags (
  user_id    uuid not null references auth.users (id) on delete cascade,
  pattern_id text not null,
  dismissed  boolean not null default false,
  in_report  boolean not null default false,
  seen       boolean not null default false,
  primary key (user_id, pattern_id)
);

-- ---------- experimentos ----------
create table public.experiments (
  id            text primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  title         text not null,
  factor        text not null,
  duration_days smallint not null check (duration_days in (7, 14, 21)),
  start_date    date not null,
  adherence     jsonb not null default '{}'::jsonb,
  status        text not null check (status in ('active', 'finished', 'cancelled'))
);

-- ---------- reportes generados (solo el registro de que se generó; el PDF no se sube) ----------
create table public.reports (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  range_days smallint not null,
  sections   text[] not null default '{}'
);

-- ---------- recordatorios ----------
create table public.reminders (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind    text not null check (kind in ('checkin', 'experiment')),
  time    text not null check (time ~ '^\d{2}:\d{2}$'),
  enabled boolean not null default true,
  primary key (user_id, kind)
);

-- ============================================================================
-- RLS: activado en TODAS las tablas. Cada persona solo ve y toca sus filas.
-- (select auth.uid()) se evalúa una vez por consulta (recomendación de rendimiento de Supabase).
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'consents', 'conditions', 'medications', 'entries', 'events',
                           'daily_context', 'pattern_flags', 'experiments', 'reports', 'reminders']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('create policy "%1$s_select_own" on public.%1$I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s_insert_own" on public.%1$I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s_update_own" on public.%1$I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s_delete_own" on public.%1$I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Un evento solo puede colgar de un registro de la misma persona.
create or replace function public.events_same_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from public.entries e where e.id = new.entry_id and e.user_id = new.user_id) then
    raise exception 'El registro no pertenece a este usuario';
  end if;
  return new;
end;
$$;

create trigger events_same_owner
  before insert or update on public.events
  for each row execute function public.events_same_owner();

-- ============================================================================
-- Al registrarse un usuario: crear su perfil (con el nombre que dio), consentimientos y recordatorio.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), ''));
  insert into public.consents (user_id) values (new.id);
  insert into public.reminders (user_id, kind, time) values (new.id, 'checkin', '21:00');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at automático
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger consents_touch before update on public.consents for each row execute function public.touch_updated_at();
