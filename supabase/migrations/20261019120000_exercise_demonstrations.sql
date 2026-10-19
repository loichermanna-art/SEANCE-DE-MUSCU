-- DEMO-01 — additive migration. Safe to apply to existing data.
create table if not exists public.exercise_demonstrations (
  id text primary key,
  exercise_id text not null references public.exercises(id) on delete cascade,
  variant_key text not null default 'default',
  animation_key text not null,
  animation_version integer not null default 1 check (animation_version > 0),
  duration_ms integer not null default 3200 check (duration_ms >= 0),
  view text not null default 'side' check (view in ('side', 'front', 'three-quarter')),
  accessibility_label text not null,
  status text not null default 'brouillon' check (status in ('publiee', 'brouillon')),
  updated_at timestamptz not null default now(),
  unique (exercise_id, variant_key)
);
create index if not exists idx_exercise_demonstrations_exercise_status
  on public.exercise_demonstrations (exercise_id, status);
alter table public.exercise_demonstrations enable row level security;
drop policy if exists "personal_anon_access" on public.exercise_demonstrations;
create policy "personal_anon_access" on public.exercise_demonstrations
  for all to anon using (true) with check (true);
