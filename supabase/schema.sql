-- ============================================================
-- GYM OS — Schéma PostgreSQL / Supabase (docs/03-modele-de-donnees.md)
-- À exécuter dans l'éditeur SQL de ton projet Supabase.
--
-- ⚠️ MODE V1 ACTUEL : usage personnel SANS authentification (décision D2).
-- Les politiques ci-dessous autorisent le rôle "anon" (clé publique).
-- Cela convient à un usage strictement personnel et temporaire.
-- AVANT toute ouverture à d'autres utilisateurs, active Supabase Auth,
-- ajoute une colonne user_id = auth.uid() et remplace ces politiques
-- par les politiques commentées en bas de fichier (§18.2 du CdC).
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists public.muscle_groups (
  id text primary key,
  name text not null
);

create table if not exists public.exercises (
  id text primary key,
  name text not null,
  alternative_names text,
  equipment text not null default 'barre',
  movement_type text not null default 'poussee',
  difficulty int not null default 1 check (difficulty between 1 and 3),
  description text not null default '',
  instructions text not null default '',
  common_mistakes text,
  is_custom boolean not null default false,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.exercise_muscles (
  id text primary key,
  exercise_id text not null references public.exercises(id) on delete cascade,
  muscle_group_id text not null references public.muscle_groups(id) on delete cascade,
  role text not null check (role in ('principal', 'secondaire'))
);


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

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  birth_year int,
  height_cm numeric check (height_cm is null or (height_cm between 100 and 250)),
  experience_level text not null default 'debutant' check (experience_level in ('debutant','intermediaire','avance')),
  training_preferences text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  goal_type text not null,
  description text not null default '',
  target_value numeric,
  unit text,
  priority int not null default 1,
  start_date date,
  target_date date,
  status text not null default 'actif' check (status in ('actif','atteint','abandonne')),
  created_at timestamptz not null default now()
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  objective text not null default '',
  status text not null default 'actif' check (status in ('actif','pause','archive')),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  name text not null,
  day_order int not null default 1,
  scheduled_weekday int check (scheduled_weekday is null or scheduled_weekday between 1 and 7),
  notes text
);

create table if not exists public.program_exercises (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references public.program_days(id) on delete cascade,
  exercise_id text references public.exercises(id) on delete set null,
  exercise_order int not null default 1,
  target_sets int not null default 3 check (target_sets > 0),
  min_reps int not null default 8 check (min_reps >= 0),
  max_reps int not null default 12 check (max_reps >= min_reps),
  target_load numeric check (target_load is null or target_load >= 0),
  rest_seconds int not null default 90 check (rest_seconds between 0 and 3600),
  notes text
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  program_id uuid references public.programs(id) on delete set null,
  program_day_id uuid references public.program_days(id) on delete set null,
  name text not null,
  status text not null default 'planifiee' check (status in ('planifiee','en_cours','terminee','interrompue','annulee')),
  planned_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  overall_effort int check (overall_effort is null or overall_effort between 1 and 10),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id text references public.exercises(id) on delete set null,
  exercise_name_snapshot text not null, -- historique préservé même si l'exercice est renommé (§6.3)
  exercise_order int not null default 1,
  status text not null default 'en_cours' check (status in ('en_cours','termine','ignore','remplace')),
  notes text
);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  set_number int not null check (set_number > 0),
  set_type text not null default 'travail' check (set_type in ('echauffement','travail')),
  load_value numeric not null default 0 check (load_value >= 0),
  load_unit text not null default 'kg' check (load_unit in ('kg','lb')),
  repetitions int not null default 0 check (repetitions >= 0),
  rir int check (rir is null or rir between 0 and 10),
  duration_seconds int check (duration_seconds is null or duration_seconds >= 0),
  status text not null default 'en_saisie' check (status in ('en_saisie','validee')),
  completed_at timestamptz,
  notes text
);

create table if not exists public.recovery_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  recorded_at timestamptz not null default now(),
  energy_level int check (energy_level is null or energy_level between 1 and 5),
  sleep_duration numeric check (sleep_duration is null or sleep_duration >= 0),
  sleep_quality int check (sleep_quality is null or sleep_quality between 1 and 5),
  general_fatigue int check (general_fatigue is null or general_fatigue between 1 and 5),
  notes text
);

create table if not exists public.muscle_soreness (
  id uuid primary key default gen_random_uuid(),
  recovery_checkin_id uuid not null references public.recovery_checkins(id) on delete cascade,
  muscle_group_id text not null references public.muscle_groups(id) on delete cascade,
  severity int not null check (severity between 0 and 4),
  pain_type text not null default 'courbature' check (pain_type in ('courbature','douleur_inhabituelle')),
  notes text
);

create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  measured_at timestamptz not null default now(),
  measurement_type text not null,
  value numeric not null check (value > 0),
  unit text not null default 'kg',
  notes text
);

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  unit_system text not null default 'kg' check (unit_system in ('kg','lb')),
  default_rest_seconds int not null default 90 check (default_rest_seconds between 0 and 3600),
  theme text not null default 'sombre'
);

create index if not exists idx_exercise_demonstrations_exercise_status on public.exercise_demonstrations(exercise_id, status);
create index if not exists idx_workout_sessions_user_status on public.workout_sessions(user_id, status);
create index if not exists idx_workout_sets_exercise on public.workout_sets(workout_exercise_id, status);
create index if not exists idx_program_days_program on public.program_days(program_id, day_order);
create index if not exists idx_body_measurements_user on public.body_measurements(user_id, measurement_type, measured_at);

-- ============================================================
-- RLS — MODE PERSONNEL SANS AUTH (temporaire, voir avertissement en tête)
-- ============================================================
alter table public.muscle_groups enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_muscles enable row level security;
alter table public.exercise_demonstrations enable row level security;
alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.programs enable row level security;
alter table public.program_days enable row level security;
alter table public.program_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.recovery_checkins enable row level security;
alter table public.muscle_soreness enable row level security;
alter table public.body_measurements enable row level security;
alter table public.user_preferences enable row level security;

-- Politique unique "usage personnel" pour chaque table (rôle anon).
do $$
declare t text;
begin
  foreach t in array array['muscle_groups','exercises','exercise_muscles','exercise_demonstrations','profiles','goals','programs','program_days','program_exercises','workout_sessions','workout_exercises','workout_sets','recovery_checkins','muscle_soreness','body_measurements','user_preferences']
  loop
    execute format('drop policy if exists "personal_anon_access" on public.%I', t);
    execute format('create policy "personal_anon_access" on public.%I for all to anon using (true) with check (true)', t);
  end loop;
end $$;

-- ============================================================
-- FUTUR (multi-utilisateur, §18.2) — à activer avec Supabase Auth :
-- alter table ... add column if not exists owner uuid default auth.uid();
-- create policy "owner_only" on public.programs for all to authenticated
--   using (owner = auth.uid()) with check (owner = auth.uid());
-- (idem pour chaque table personnelle, et suppression des politiques anon)
-- ============================================================
