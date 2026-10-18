-- ============================================================================
-- Kalma · fase 9: experimentos con síntoma de comparación, médicos y "Volví del médico".
-- Mismo patrón que la migración inicial: user_id → auth.users on delete cascade + RLS.
-- ============================================================================

-- Síntoma con el que cada experimento compara "antes vs. durante"
alter table public.experiments
  add column if not exists outcome text not null default 'dolor de cabeza';

-- Médicos de la persona (para el reporte y "Volví del médico")
create table if not exists public.doctors (
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  specialty  text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, name)
);

-- "Volví del médico": lo que la persona contó, organizado (diagnóstico mencionado, medicamentos,
-- indicaciones y próximos controles en data jsonb). Kalma no interpreta: solo ordena.
create table if not exists public.doctor_visits (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  visited_at timestamptz not null,
  doctor     text,
  transcript text not null default '',
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists doctor_visits_user_idx on public.doctor_visits (user_id, visited_at desc);

do $$
declare
  t text;
begin
  foreach t in array array['doctors', 'doctor_visits']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('drop policy if exists "%1$s_select_own" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_insert_own" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_update_own" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_delete_own" on public.%1$I', t);
    execute format('create policy "%1$s_select_own" on public.%1$I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s_insert_own" on public.%1$I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s_update_own" on public.%1$I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s_delete_own" on public.%1$I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end $$;
