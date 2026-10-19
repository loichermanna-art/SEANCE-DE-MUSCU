-- Snapshot prescription targets and units at session start so later program
-- edits cannot rewrite training history. Existing history remains valid with
-- null snapshots; legacy program target loads default to kilograms.
alter table public.program_exercises
  add column if not exists target_load_unit text not null default 'kg' check (target_load_unit in ('kg','lb'));

alter table public.workout_exercises
  add column if not exists target_sets_snapshot integer check (target_sets_snapshot is null or target_sets_snapshot between 1 and 20),
  add column if not exists min_reps_snapshot integer check (min_reps_snapshot is null or min_reps_snapshot between 1 and 100),
  add column if not exists max_reps_snapshot integer check (max_reps_snapshot is null or max_reps_snapshot between 1 and 100),
  add column if not exists target_load_snapshot numeric check (target_load_snapshot is null or target_load_snapshot between 0 and 1000),
  add column if not exists target_load_unit_snapshot text check (target_load_unit_snapshot is null or target_load_unit_snapshot in ('kg','lb')),
  add column if not exists rest_seconds_snapshot integer check (rest_seconds_snapshot is null or rest_seconds_snapshot between 0 and 3600);
