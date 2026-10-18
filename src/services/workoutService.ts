// GYM OS — Service Séance en direct (§7).
// Sauvegarde PROGRESSIVE : chaque série validée est écrite immédiatement
// dans IndexedDB (§21) — fermeture navigateur = zéro perte (R1).

import { db, newId, nowIso } from './db'
import { LOCAL_USER_ID, type ProgramDay, type ProgramExercise, type WorkoutExercise, type WorkoutSession, type WorkoutSet, type RestTimerState } from '../domain/types'
import { buildSessionExercises, computeSetPrefill } from '../domain/session'
import { validateSetInput } from '../domain/validation'
import { getPreferences } from './profileService'

export interface SessionDetail {
  session: WorkoutSession
  exercises: Array<WorkoutExercise & { sets: WorkoutSet[] }>
}

/** Séance active = en_cours ou interrompue (reprise §7.5). */
export async function getActiveSession(): Promise<WorkoutSession | undefined> {
  const sessions = await db.workoutSessions
    .where('status')
    .anyOf(['en_cours', 'interrompue'])
    .toArray()
  return sessions.sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''))[0]
}

export async function getSessionDetail(sessionId: string): Promise<SessionDetail | null> {
  const session = await db.workoutSessions.get(sessionId)
  if (!session) return null
  const exercises = await db.workoutExercises
    .where('workoutSessionId')
    .equals(sessionId)
    .sortBy('exerciseOrder')
  const exerciseIds = exercises.map((e) => e.id)
  const sets = exerciseIds.length > 0
    ? await db.workoutSets.where('workoutExerciseId').anyOf(exerciseIds).toArray()
    : []
  return {
    session,
    exercises: exercises.map((ex) => ({
      ...ex,
      sets: sets
        .filter((s) => s.workoutExerciseId === ex.id)
        .sort((a, b) => a.setNumber - b.setNumber),
    })),
  }
}

/**
 * Démarre une séance — depuis un jour de programme (snapshots §6.3)
 * ou une séance libre. Les séries sont pré-créées et pré-remplies (§7.3).
 */
export async function startSession(input: { programId?: string; programDayId?: string; name?: string }): Promise<WorkoutSession> {
  const existing = await getActiveSession()
  if (existing) throw new Error('Une séance est déjà en cours — reprends-la ou termine-la d’abord.')

  const session: WorkoutSession = {
    id: newId(), userId: LOCAL_USER_ID,
    programId: input.programId,
    programDayId: input.programDayId,
    name: input.name ?? 'Séance libre',
    status: 'en_cours',
    startedAt: nowIso(),
    createdAt: nowIso(), updatedAt: nowIso(),
  }

  await db.workoutSessions.put(session)

  if (input.programDayId) {
    const programExercises = await db.programExercises.where('programDayId').equals(input.programDayId).sortBy('exerciseOrder')
    const exercises = await db.exercises.toArray()
    const nameOf = (id: string) => exercises.find((e) => e.id === id)?.name ?? 'Exercice supprimé'
    const drafts = buildSessionExercises(
      programExercises.map((pe) => ({ ...pe, exerciseName: nameOf(pe.exerciseId) })),
      session.id,
    )
    for (const draft of drafts) {
      const ex = await db.workoutExercises.put({ ...draft, id: newId() })
      await createInitialSets(ex, draft)
    }
  }
  return session
}

/** Séries initiales pré-remplies (§7.3) : dernière perf, sinon cibles. */
async function createInitialSets(
  workoutExerciseId: string,
  draft: Pick<WorkoutExercise, 'targetSets' | 'targetLoad' | 'minReps' | 'maxReps'>,
): Promise<void> {
  const count = draft.targetSets ?? 0
  if (count === 0) return
  const prefill = await prefillForNextSet(workoutExerciseId)
  for (let i = 1; i <= count; i++) {
    await db.workoutSets.put({
      id: newId(), workoutExerciseId,
      setNumber: i, setType: 'travail',
      loadValue: prefill.loadValue, loadUnit: 'kg',
      repetitions: prefill.repetitions,
      status: 'en_saisie',
    })
  }
}

/** Dernières séries de travail validées d'un exercice (séances terminées). */
export async function getLastPerformance(exerciseId: string): Promise<WorkoutSet[]> {
  const rows = await db.workoutExercises.where('exerciseId').equals(exerciseId).toArray()
  if (rows.length === 0) return []
  const sessionIds = [...new Set(rows.map((r) => r.workoutSessionId))]
  const sessions = await db.workoutSessions.where('id').anyOf(sessionIds).toArray()
  const finished = sessions
    .filter((s) => s.status === 'terminee')
    .sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''))
  for (const session of finished) {
    const row = rows.find((r) => r.workoutSessionId === session.id)
    if (!row) continue
    const sets = await db.workoutSets.where('workoutExerciseId').equals(row.id).toArray()
    const work = sets.filter((s) => s.status === 'validee' && s.setType === 'travail')
    if (work.length > 0) return work.sort((a, b) => a.setNumber - b.setNumber)
  }
  return []
}

/** Pré-remplissage d'une nouvelle série (§7.3). */
export async function prefillForNextSet(workoutExerciseId: string): Promise<{ loadValue: number; repetitions: number }> {
  const ex = await db.workoutExercises.get(workoutExerciseId)
  if (!ex) return { loadValue: 0, repetitions: 0 }
  const sets = await db.workoutSets.where('workoutExerciseId').equals(workoutExerciseId).toArray()
  const lastValidated = sets
    .filter((s) => s.status === 'validee')
    .sort((a, b) => a.setNumber - b.setNumber)
    .at(-1) ?? null
  const history = ex.exerciseId ? await getLastPerformance(ex.exerciseId) : []
  return computeSetPrefill({
    targetLoad: ex.targetLoad,
    minReps: ex.minReps ?? 0,
    maxReps: ex.maxReps ?? 0,
    lastSetInSession: lastValidated ? { loadValue: lastValidated.loadValue, repetitions: lastValidated.repetitions } : null,
    lastSetInHistory: history.at(-1) ? { loadValue: history.at(-1)!.loadValue, repetitions: history.at(-1)!.repetitions } : null,
  })
}

export async function addSet(workoutExerciseId: string): Promise<WorkoutSet> {
  const sets = await db.workoutSets.where('workoutExerciseId').equals(workoutExerciseId).toArray()
  const maxNumber = sets.reduce((max, s) => Math.max(max, s.setNumber), 0)
  const prefill = await prefillForNextSet(workoutExerciseId)
  const set: WorkoutSet = {
    id: newId(), workoutExerciseId,
    setNumber: maxNumber + 1, setType: 'travail',
    loadValue: prefill.loadValue, loadUnit: 'kg',
    repetitions: prefill.repetitions,
    status: 'en_saisie',
  }
  await db.workoutSets.put(set)
  return set
}

/** Valide une série — écriture immédiate (sauvegarde progressive, §7.2).
 *  Lance aussi le minuteur de repos (§7.4) pour une série de travail. */
export async function validateSet(setId: string, input: { loadValue: number; repetitions: number; rir?: number }): Promise<void> {
  const v = validateSetInput(input)
  if (!v.ok) throw new Error(v.errors[0])
  const set = await db.workoutSets.get(setId)
  if (!set) throw new Error('Série introuvable.')
  if (set.status === 'validee') return // idempotent
  await db.workoutSets.update(setId, {
    status: 'validee',
    loadValue: input.loadValue,
    repetitions: input.repetitions,
    rir: input.rir,
    completedAt: nowIso(),
  })
  const exercise = await db.workoutExercises.get(set.workoutExerciseId)
  // Minuteur de repos (§7.4) : cible copiée au snapshot, sinon préférence
  if (set.setType === 'travail') {
    const rest = exercise?.restSeconds ?? (await getPreferences()).defaultRestSeconds
    await startRestTimer(rest, exercise?.exerciseNameSnapshot)
  }
  if (exercise?.targetSets && set.setType === 'travail') {
    const sets = await db.workoutSets.where('workoutExerciseId').equals(set.workoutExerciseId).toArray()
    const validatedWork = sets.filter((s) => s.setType === 'travail' && s.status === 'validee').length
    const maxNumber = sets.reduce((max, s) => Math.max(max, s.setNumber), 0)
    if (validatedWork < exercise.targetSets) {
      // Héritage (§7.3) : la prochaine série de travail en saisie
      // reprend la charge et les reps de la série qu'on vient de valider.
      const nextPending = sets
        .filter((s) => s.status === 'en_saisie' && s.setType === 'travail')
        .sort((a, b) => a.setNumber - b.setNumber)[0]
      if (nextPending) {
        await db.workoutSets.update(nextPending.id, { loadValue: input.loadValue, repetitions: input.repetitions })
      } else {
        const prefill = await prefillForNextSet(set.workoutExerciseId)
        await db.workoutSets.put({
          id: newId(), workoutExerciseId: set.workoutExerciseId,
          setNumber: maxNumber + 1, setType: 'travail',
          loadValue: prefill.loadValue, loadUnit: 'kg',
          repetitions: prefill.repetitions, status: 'en_saisie',
        })
      }
    }
  }
  await touchSession(set.workoutExerciseId)
}

async function touchSession(workoutExerciseId: string): Promise<void> {
  const ex = await db.workoutExercises.get(workoutExerciseId)
  if (!ex) return
  await db.workoutSessions.update(ex.workoutSessionId, { updatedAt: nowIso() })
}

export async function updateSet(setId: string, patch: Partial<Pick<WorkoutSet, 'loadValue' | 'repetitions' | 'rir' | 'setType' | 'notes'>>): Promise<void> {
  const set = await db.workoutSets.get(setId)
  if (!set) throw new Error('Série introuvable.')
  if (set.status === 'validee') throw new Error('Une série validée est immuable (§19.2) — supprime-la puis ressaisis-la.')
  const v = validateSetInput({
    loadValue: patch.loadValue ?? set.loadValue,
    repetitions: patch.repetitions ?? set.repetitions,
    rir: patch.rir ?? set.rir,
  })
  if (!v.ok) throw new Error(v.errors[0])
  await db.workoutSets.update(setId, patch)
  await touchSession(set.workoutExerciseId)
}

export async function deleteSet(setId: string): Promise<void> {
  const set = await db.workoutSets.get(setId)
  if (!set) return
  if (set.status === 'validee') throw new Error('Une série validée est conservée (§19.2) — utilise l’annulation de validation si besoin.')
  await db.workoutSets.delete(setId)
}

export async function addExerciseToSession(sessionId: string, exerciseId: string, targets?: { targetSets?: number; minReps?: number; maxReps?: number; targetLoad?: number; restSeconds?: number }): Promise<void> {
  const exercise = await db.exercises.get(exerciseId)
  if (!exercise) throw new Error('Exercice introuvable.')
  const session = await db.workoutSessions.get(sessionId)
  if (!session) throw new Error('Séance introuvable.')
  const count = await db.workoutExercises.where('workoutSessionId').equals(sessionId).count()
  const ex: WorkoutExercise = {
    id: newId(), workoutSessionId: sessionId,
    exerciseId, exerciseNameSnapshot: exercise.name,
    exerciseOrder: count, status: 'en_cours',
    targetSets: targets?.targetSets, minReps: targets?.minReps,
    maxReps: targets?.maxReps, targetLoad: targets?.targetLoad,
    restSeconds: targets?.restSeconds,
  }
  await db.workoutExercises.put(ex)
  if (ex.targetSets) {
    const history = await getLastPerformance(exerciseId)
    const last = history.at(-1)
    for (let i = 1; i <= ex.targetSets; i++) {
      const prefill = last
        ? { loadValue: last.loadValue, repetitions: last.repetitions }
        : { loadValue: ex.targetLoad ?? 0, repetitions: ex.maxReps ?? ex.minReps ?? 0 }
      await db.workoutSets.put({
        id: newId(), workoutExerciseId: ex.id, setNumber: i, setType: 'travail',
        loadValue: prefill.loadValue, loadUnit: 'kg',
        repetitions: prefill.repetitions, status: 'en_saisie',
      })
    }
  }
}

/** Retire un exercice — jamais s'il a des séries validées (traçabilité §19.2). */
export async function removeExerciseFromSession(workoutExerciseId: string): Promise<void> {
  const ex = await db.workoutExercises.get(workoutExerciseId)
  if (!ex) return
  const validated = await db.workoutSets.where('workoutExerciseId').equals(workoutExerciseId).and((s) => s.status === 'validee').count()
  if (validated > 0) throw new Error('Cet exercice a des séries validées : il reste dans l’historique. Marque-le « ignoré » plutôt que de le supprimer.')
  await db.transaction('rw', [db.workoutExercises, db.workoutSets], async () => {
    await db.workoutSets.where('workoutExerciseId').equals(workoutExerciseId).delete()
    await db.workoutExercises.delete(workoutExerciseId)
  })
}

export async function setExerciseStatus(workoutExerciseId: string, status: WorkoutExercise['status']): Promise<void> {
  await db.workoutExercises.update(workoutExerciseId, { status })
}

export async function setExerciseNotes(workoutExerciseId: string, notes: string): Promise<void> {
  await db.workoutExercises.update(workoutExerciseId, { notes: notes.trim() || undefined })
}

export async function pauseSession(sessionId: string): Promise<void> {
  await db.workoutSessions.update(sessionId, { status: 'interrompue', updatedAt: nowIso() })
}

export async function resumeSession(sessionId: string): Promise<void> {
  await db.workoutSessions.update(sessionId, { status: 'en_cours', updatedAt: nowIso() })
}

/** Abandon : la séance reste consultable (annulée), les séries validées sont conservées. */
export async function abandonSession(sessionId: string): Promise<void> {
  await db.workoutSessions.update(sessionId, { status: 'annulee', endedAt: nowIso(), updatedAt: nowIso() })
  await stopRestTimer()
}

/** Fin de séance (§7.6) : les séries non saisies sont retirées, les validées conservées. */
export async function finishSession(sessionId: string, overallEffort?: number, notes?: string): Promise<void> {
  const session = await db.workoutSessions.get(sessionId)
  if (!session) return
  const exercises = await db.workoutExercises.where('workoutSessionId').equals(sessionId).toArray()
  const exerciseIds = exercises.map((e) => e.id)
  await db.transaction('rw', [db.workoutSessions, db.workoutSets], async () => {
    for (const id of exerciseIds) {
      await db.workoutSets.where('workoutExerciseId').equals(id).and((s) => s.status === 'en_saisie').delete()
    }
    await db.workoutSessions.update(sessionId, {
      status: 'terminee', endedAt: nowIso(),
      overallEffort, notes: notes?.trim() || undefined, updatedAt: nowIso(),
    })
  })
  await stopRestTimer()
}

/* ——— Minuteur de repos (§7.4) ——— */

export async function getRestTimer(): Promise<RestTimerState | undefined> {
  return db.restTimers.get('active')
}

/** Démarre/relance le minuteur à partir d'un horodatage ABSOLU (§7.4). */
export async function startRestTimer(seconds: number, label?: string): Promise<void> {
  if (seconds <= 0) return
  await db.restTimers.put({
    id: 'active',
    endsAt: new Date(Date.now() + seconds * 1000).toISOString(),
    durationSeconds: seconds, label, createdAt: nowIso(),
  })
}

export async function adjustRestTimer(deltaSeconds: number): Promise<void> {
  const timer = await db.restTimers.get('active')
  if (!timer) return
  const remaining = Math.max(5, Math.round((new Date(timer.endsAt).getTime() - Date.now()) / 1000) + deltaSeconds)
  await db.restTimers.update('active', { endsAt: new Date(Date.now() + remaining * 1000).toISOString(), durationSeconds: remaining })
}

export async function stopRestTimer(): Promise<void> {
  await db.restTimers.delete('active')
}

/** Jour de programme avec son programme (pour l'écran de démarrage). */
export interface StartableDay {
  day: ProgramDay
  programName: string
  exerciseCount: number
  targets: ProgramExercise[]
}

export async function listStartableDays(): Promise<StartableDay[]> {
  const programs = await db.programs.where('status').equals('actif').toArray()
  const programIds = new Set(programs.map((p) => p.id))
  const days = await db.programDays.toArray()
  const allExercises = await db.programExercises.toArray()
  const result: StartableDay[] = []
  for (const day of days.sort((a, b) => a.dayOrder - b.dayOrder)) {
    if (!programIds.has(day.programId)) continue
    const program = programs.find((p) => p.id === day.programId)
    const targets = allExercises.filter((pe) => pe.programDayId === day.id)
    result.push({ day, programName: program?.name ?? '', exerciseCount: targets.length, targets })
  }
  return result
}
