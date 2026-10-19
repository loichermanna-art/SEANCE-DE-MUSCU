-- DEMO-01 audit fix: align SQL view/duration metadata with TypeScript and the specification.
-- Drop old checks first so legacy values can be normalized safely.
alter table public.exercise_demonstrations
  drop constraint if exists exercise_demonstrations_view_check;
alter table public.exercise_demonstrations
  drop constraint if exists exercise_demonstrations_duration_ms_check;

update public.exercise_demonstrations
set view = 'three_quarter'
where view = 'three-quarter';

-- Refresh the built-in default sequence metadata without changing custom variants.
update public.exercise_demonstrations
set
  animation_version = 2,
  view = case animation_key
    when 'incline-dumbbell-press' then 'three_quarter'
    when 'lateral-raise' then 'front'
    when 'plank' then 'static'
    else 'side'
  end,
  duration_ms = case animation_key
    when 'bench-press' then 6600
    when 'incline-dumbbell-press' then 6600
    when 'pull-up' then 6000
    when 'barbell-row' then 6000
    when 'lat-pulldown' then 6000
    when 'overhead-press' then 6000
    when 'lateral-raise' then 6000
    when 'barbell-curl' then 5400
    when 'barbell-squat' then 6600
    when 'leg-press' then 6000
    when 'romanian-deadlift' then 6600
    when 'hip-thrust' then 6000
    when 'crunch' then 4800
    when 'plank' then 0
    else duration_ms
  end,
  updated_at = now()
where variant_key = 'default'
  and animation_key in (
    'bench-press', 'incline-dumbbell-press', 'pull-up', 'barbell-row',
    'lat-pulldown', 'overhead-press', 'lateral-raise', 'barbell-curl',
    'barbell-squat', 'leg-press', 'romanian-deadlift', 'hip-thrust', 'crunch', 'plank'
  );

-- Normalize any other legacy zero durations as animated demos; only static views stay at 0.
update public.exercise_demonstrations set duration_ms = 6000 where view <> 'static' and duration_ms = 0;
update public.exercise_demonstrations set duration_ms = 0 where view = 'static';

alter table public.exercise_demonstrations
  alter column animation_version set default 2,
  alter column duration_ms set default 6000;

alter table public.exercise_demonstrations
  add constraint exercise_demonstrations_view_check
  check (view in ('side', 'front', 'three_quarter', 'static'));

alter table public.exercise_demonstrations
  add constraint exercise_demonstrations_duration_ms_check
  check (
    (view = 'static' and duration_ms = 0)
    or (view <> 'static' and duration_ms between 1000 and 12000)
  );
