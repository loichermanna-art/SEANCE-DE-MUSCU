import type { WorkoutExercise, WorkoutSession, WorkoutSet, ProgramExercise } from '../domain/types'
import { LOCAL_USER_ID } from '../domain/types'
import { validateSetInput } from '../domain/validation'
import { db, newId, nowIso } from './db'

export class WorkoutServiceError extends Error {
  constructor(message: string, public readonly code: 'NOT_FOUND' | 'VALIDATION' | 'ACTIVE_SESSION' | 'STORAGE') {
    super(message)
    this.name = 'WorkoutServiceError'
  }
}

export interface WorkoutExerciseDetail extends WorkoutExercise {
  sets: WorkoutSet[]
}
export interface WorkoutDetail {
  session: WorkoutSession
  exercises: WorkoutExerciseDetail[]
}

function orderSets(sets: WorkoutSet[]): WorkoutSet[] {
  return sets.sort((a, b) => a.setNumber - b.setNumber || a.id.localeCompare(b.id))
}

async function assertNoOtherActiveSession(exceptId?: string) {
  const active = await db.workoutSessions.where('userId').equals(LOCAL_USER_ID)
    .filter(session => (session.status === 'en_cours' || session.status === 'interrompue') && session.id !== exceptId)
    .first()
  if (active) throw new WorkoutServiceError('Une autre séance est déjà en cours. Reprends-la ou termine-la avant d’en démarrer une nouvelle.', 'ACTIVE_SESSION')
}

async function createSession(name: string, programId?: string, programDayId?: string): Promise<WorkoutSession> {
  const now = nowIso()
  const session: WorkoutSession = {
    id: newId(), userId: LOCAL_USER_ID, programId, programDayId, name,
    status: 'en_cours', startedAt: now, createdAt: now, updatedAt: now,
  }
  await db.workoutSessions.add(session)
  return session
}

async function latestWorkSets(exerciseId: string): Promise<WorkoutSet[]> {
  const sessions = (await db.workoutSessions.where('userId').equals(LOCAL_USER_ID).toArray())
    .filter(session => session.status === 'terminee')
    .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))
  for (const session of sessions) {
    const workoutExercise = await db.workoutExercises.where('workoutSessionId').equals(session.id)
      .filter(row => row.exerciseId === exerciseId && row.status === 'termine').first()
    if (!workoutExercise) continue
    const sets = orderSets(await db.workoutSets.where('workoutExerciseId').equals(workoutExercise.id)
      .filter(set => set.status === 'validee' && set.setType === 'travail').toArray())
    if (sets.length) return sets
  }
  return []
}

function blankSet(workoutExerciseId: string, setNumber: number, prior?: WorkoutSet, defaultUnit: 'kg' | 'lb' = 'kg'): WorkoutSet {
  return {
    id: newId(), workoutExerciseId, setNumber, setType: 'travail', loadValue: prior?.loadValue ?? 0,
    loadUnit: prior?.loadUnit ?? defaultUnit, repetitions: prior?.repetitions ?? 0, status: 'en_saisie',
  }
}

async function buildDetail(session: WorkoutSession): Promise<WorkoutDetail> {
  const rows = (await db.workoutExercises.where('workoutSessionId').equals(session.id).toArray())
    .sort((a, b) => a.exerciseOrder - b.exerciseOrder || a.id.localeCompare(b.id))
  const exercises = await Promise.all(rows.map(async row => ({
    ...row,
    sets: orderSets(await db.workoutSets.where('workoutExerciseId').equals(row.id).toArray()),
  })))
  return { session, exercises }
}

export const workoutService = {
  async listProgramDays() {
    const programs = (await db.programs.where('userId').equals(LOCAL_USER_ID).toArray())
      .filter(program => program.status === 'actif')
    const days = await db.programDays.toArray()
    const rows = []
    for (const program of programs) {
      for (const day of days.filter(item => item.programId === program.id).sort((a, b) => a.dayOrder - b.dayOrder)) {
        const planned = (await db.programExercises.where('programDayId').equals(day.id).toArray())
          .sort((a, b) => a.exerciseOrder - b.exerciseOrder)
        rows.push({ program, day, exerciseCount: planned.length })
      }
    }
    return rows
  },

  async getActiveSession(): Promise<WorkoutDetail | undefined> {
    const session = await db.workoutSessions.where('userId').equals(LOCAL_USER_ID)
      .filter(row => row.status === 'en_cours' || row.status === 'interrompue')
      .first()
    return session ? buildDetail(session) : undefined
  },

  async getSession(sessionId: string): Promise<WorkoutDetail | undefined> {
    const session = await db.workoutSessions.get(sessionId)
    if (!session || session.userId !== LOCAL_USER_ID) return undefined
    return buildDetail(session)
  },

  async startFromDay(programDayId: string): Promise<WorkoutDetail> {
    return db.transaction('rw', [db.programs, db.programDays, db.programExercises, db.exercises, db.workoutSessions,
      db.workoutExercises, db.workoutSets, db.userPreferences], async () => {
        await assertNoOtherActiveSession()
        const day = await db.programDays.get(programDayId)
        if (!day) throw new WorkoutServiceError('Ce jour du programme est introuvable.', 'NOT_FOUND')
        const program = await db.programs.get(day.programId)
        if (!program || program.userId !== LOCAL_USER_ID) throw new WorkoutServiceError('Le programme associé est introuvable.', 'NOT_FOUND')
        if (program.status !== 'actif') throw new WorkoutServiceError('Seul un programme actif peut démarrer une séance.', 'VALIDATION')
        const planned = (await db.programExercises.where('programDayId').equals(day.id).toArray())
          .sort((a, b) => a.exerciseOrder - b.exerciseOrder)
        if (!planned.length) throw new WorkoutServiceError('Ajoute au moins un exercice à cette journée avant de démarrer.', 'VALIDATION')
        const session = await createSession(`${program.name} · ${day.name}`, program.id, day.id)
        const unitSystem = (await db.userPreferences.where('userId').equals(LOCAL_USER_ID).first())?.unitSystem ?? 'kg'
        for (const [index, prescription] of planned.entries()) {
          const exercise = await db.exercises.get(prescription.exerciseId)
          if (!exercise) throw new WorkoutServiceError('Un exercice de cette journée est introuvable dans la bibliothèque.', 'NOT_FOUND')
          const workoutExercise: WorkoutExercise = {
            id: newId(), workoutSessionId: session.id, exerciseId: exercise.id, exerciseNameSnapshot: exercise.name,
            exerciseOrder: index + 1, targetSetsSnapshot: prescription.targetSets, minRepsSnapshot: prescription.minReps,
            maxRepsSnapshot: prescription.maxReps, targetLoadSnapshot: prescription.targetLoad,
            targetLoadUnitSnapshot: prescription.targetLoadUnit ?? unitSystem,
            restSecondsSnapshot: prescription.restSeconds, status: 'en_cours',
          }
          await db.workoutExercises.add(workoutExercise)
          const previous = await latestWorkSets(exercise.id)
          const previousByNumber = new Map(previous.map(set => [set.setNumber, set]))
          for (let setNumber = 1; setNumber <= prescription.targetSets; setNumber += 1) {
            const prior = previousByNumber.get(setNumber) ?? previous.at(-1)
            await db.workoutSets.add({
              ...blankSet(workoutExercise.id, setNumber, prior, unitSystem),
              loadValue: prescription.targetLoad ?? prior?.loadValue ?? 0,
              loadUnit: prescription.targetLoad !== undefined ? prescription.targetLoadUnit ?? unitSystem : prior?.loadUnit ?? unitSystem,
              repetitions: prior?.repetitions ?? prescription.minReps,
            })
          }
        }
        await db.workoutSessions.update(session.id, { updatedAt: nowIso() })
        return buildDetail(session)
      })
  },

  async startFree(name = 'Séance libre'): Promise<WorkoutDetail> {
    const cleanName = name.trim().slice(0, 80) || 'Séance libre'
    return db.transaction('rw', db.workoutSessions, db.workoutExercises, db.workoutSets, async () => {
      await assertNoOtherActiveSession()
      const session = await createSession(cleanName)
      return { session, exercises: [] }
    })
  },

  async resume(sessionId: string): Promise<WorkoutDetail> {
    return db.transaction('rw', db.workoutSessions, db.workoutExercises, db.workoutSets, async () => {
      const session = await db.workoutSessions.get(sessionId)
      if (!session || session.userId !== LOCAL_USER_ID) throw new WorkoutServiceError('Cette séance est introuvable.', 'NOT_FOUND')
      if (session.status !== 'interrompue' && session.status !== 'en_cours') throw new WorkoutServiceError('Cette séance ne peut plus être reprise.', 'VALIDATION')
      await assertNoOtherActiveSession(sessionId)
      if (session.status === 'interrompue') await db.workoutSessions.update(sessionId, { status: 'en_cours', updatedAt: nowIso() })
      const updated = await db.workoutSessions.get(sessionId)
      return buildDetail(updated!)
    })
  },

  async addExercise(sessionId: string, exerciseId: string): Promise<WorkoutExerciseDetail> {
    return db.transaction('rw', [db.workoutSessions, db.workoutExercises, db.workoutSets, db.exercises, db.userPreferences], async () => {
      const session = await db.workoutSessions.get(sessionId)
      if (!session || session.userId !== LOCAL_USER_ID) throw new WorkoutServiceError('Cette séance est introuvable.', 'NOT_FOUND')
      if (session.status !== 'en_cours') throw new WorkoutServiceError('Reprends la séance avant de modifier ses exercices.', 'VALIDATION')
      const exercise = await db.exercises.get(exerciseId)
      if (!exercise) throw new WorkoutServiceError('Cet exercice est introuvable dans la bibliothèque.', 'NOT_FOUND')
      const existing = await db.workoutExercises.where('workoutSessionId').equals(sessionId).toArray()
      if (existing.some(row => row.exerciseId === exerciseId && row.status !== 'ignore')) {
        throw new WorkoutServiceError('Cet exercice est déjà présent dans la séance.', 'VALIDATION')
      }
      const workoutExercise: WorkoutExercise = {
        id: newId(), workoutSessionId: sessionId, exerciseId, exerciseNameSnapshot: exercise.name,
        exerciseOrder: existing.length + 1, status: 'en_cours',
      }
      const unitSystem = (await db.userPreferences.where('userId').equals(LOCAL_USER_ID).first())?.unitSystem ?? 'kg'
      await db.workoutExercises.add(workoutExercise)
      await db.workoutSets.add(blankSet(workoutExercise.id, 1, undefined, unitSystem))
      await db.workoutSessions.update(sessionId, { updatedAt: nowIso() })
      return { ...workoutExercise, sets: await db.workoutSets.where('workoutExerciseId').equals(workoutExercise.id).toArray() }
    })
  },

  async updateSetDraft(setId: string, input: Pick<WorkoutSet, 'loadValue' | 'loadUnit' | 'repetitions' | 'rir'>): Promise<void> {
    const validation = validateSetInput(input)
    if (!validation.ok) throw new WorkoutServiceError(validation.errors[0], 'VALIDATION')
    if (input.loadUnit !== 'kg' && input.loadUnit !== 'lb') throw new WorkoutServiceError('Choisis une unité valide.', 'VALIDATION')
    await db.transaction('rw', db.workoutSets, db.workoutExercises, db.workoutSessions, async () => {
      const set = await db.workoutSets.get(setId)
      if (!set) throw new WorkoutServiceError('Cette série est introuvable.', 'NOT_FOUND')
      if (set.status !== 'en_saisie') throw new WorkoutServiceError('Une série validée ne peut pas être modifiée.', 'VALIDATION')
      const parent = await db.workoutExercises.get(set.workoutExerciseId)
      const session = parent ? await db.workoutSessions.get(parent.workoutSessionId) : undefined
      if (!parent || !session || session.status !== 'en_cours') throw new WorkoutServiceError('La séance n’est plus modifiable.', 'VALIDATION')
      await db.workoutSets.update(setId, input)
      await db.workoutSessions.update(session.id, { updatedAt: nowIso() })
    })
  },

  async completeSet(setId: string): Promise<WorkoutSet> {
    return db.transaction('rw', db.workoutSets, db.workoutExercises, db.workoutSessions, async () => {
      const set = await db.workoutSets.get(setId)
      if (!set) throw new WorkoutServiceError('Cette série est introuvable.', 'NOT_FOUND')
      if (set.status !== 'en_saisie') throw new WorkoutServiceError('Cette série est déjà validée.', 'VALIDATION')
      const parent = await db.workoutExercises.get(set.workoutExerciseId)
      const session = parent ? await db.workoutSessions.get(parent.workoutSessionId) : undefined
      if (!parent || !session || session.status !== 'en_cours') throw new WorkoutServiceError('La séance n’est plus modifiable.', 'VALIDATION')
      const validation = validateSetInput(set)
      if (!validation.ok) throw new WorkoutServiceError(validation.errors[0], 'VALIDATION')
      if (set.repetitions < 1) throw new WorkoutServiceError('Saisis au moins une répétition avant de valider la série.', 'VALIDATION')
      const updated: WorkoutSet = { ...set, status: 'validee', completedAt: nowIso() }
      await db.workoutSets.put(updated)
      await db.workoutSessions.update(session.id, { updatedAt: nowIso() })
      return updated
    })
  },

  async addSet(workoutExerciseId: string, setType: WorkoutSet['setType'] = 'travail'): Promise<WorkoutSet> {
    return db.transaction('rw', [db.workoutExercises, db.workoutSessions, db.workoutSets, db.userPreferences], async () => {
      const row = await db.workoutExercises.get(workoutExerciseId)
      const session = row ? await db.workoutSessions.get(row.workoutSessionId) : undefined
      if (!row || !session) throw new WorkoutServiceError('Cet exercice de séance est introuvable.', 'NOT_FOUND')
      if (session.status !== 'en_cours') throw new WorkoutServiceError('Reprends la séance avant d’ajouter une série.', 'VALIDATION')
      const sets = orderSets(await db.workoutSets.where('workoutExerciseId').equals(row.id).toArray())
      const last = [...sets].reverse().find(set => set.setType === setType)
      const unitSystem = (await db.userPreferences.where('userId').equals(LOCAL_USER_ID).first())?.unitSystem ?? 'kg'
      const set = { ...blankSet(row.id, sets.length + 1, last, unitSystem), setType }
      await db.workoutSets.add(set)
      return set
    })
  },

  async skipSet(setId: string): Promise<void> {
    await db.transaction('rw', db.workoutSets, db.workoutExercises, db.workoutSessions, async () => {
      const set = await db.workoutSets.get(setId)
      if (!set) throw new WorkoutServiceError('Cette série est introuvable.', 'NOT_FOUND')
      if (set.status !== 'en_saisie') throw new WorkoutServiceError('Une série déjà validée est conservée dans l’historique.', 'VALIDATION')
      const row = await db.workoutExercises.get(set.workoutExerciseId)
      const session = row ? await db.workoutSessions.get(row.workoutSessionId) : undefined
      if (!row || !session || session.status !== 'en_cours') throw new WorkoutServiceError('La séance n’est plus modifiable.', 'VALIDATION')
      await db.workoutSets.delete(set.id)
      const remaining = orderSets(await db.workoutSets.where('workoutExerciseId').equals(row.id).toArray())
      await Promise.all(remaining.map((item, index) => db.workoutSets.update(item.id, { setNumber: index + 1 })))
    })
  },

  async moveExercise(workoutExerciseId: string, direction: -1 | 1): Promise<void> {
    await db.transaction('rw', db.workoutExercises, db.workoutSessions, async () => {
      const row = await db.workoutExercises.get(workoutExerciseId)
      const session = row ? await db.workoutSessions.get(row.workoutSessionId) : undefined
      if (!row || !session) throw new WorkoutServiceError('Cet exercice de séance est introuvable.', 'NOT_FOUND')
      if (session.status !== 'en_cours') throw new WorkoutServiceError('Reprends la séance avant de réorganiser les exercices.', 'VALIDATION')
      const rows = (await db.workoutExercises.where('workoutSessionId').equals(session.id).toArray())
        .sort((a, b) => a.exerciseOrder - b.exerciseOrder || a.id.localeCompare(b.id))
      const index = rows.findIndex(item => item.id === row.id)
      const target = index + direction
      if (target >= 0 && target < rows.length) [rows[index], rows[target]] = [rows[target], rows[index]]
      await Promise.all(rows.map((item, order) => db.workoutExercises.update(item.id, { exerciseOrder: order + 1 })))
    })
  },

  async finish(sessionId: string, input: { overallEffort?: number; notes?: string } = {}): Promise<WorkoutSession> {
    return db.transaction('rw', db.workoutSessions, db.workoutExercises, db.workoutSets, async () => {
      const session = await db.workoutSessions.get(sessionId)
      if (!session || session.userId !== LOCAL_USER_ID) throw new WorkoutServiceError('Cette séance est introuvable.', 'NOT_FOUND')
      if (session.status !== 'en_cours') throw new WorkoutServiceError('Reprends la séance avant de la terminer.', 'VALIDATION')
      if (input.overallEffort !== undefined && (!Number.isInteger(input.overallEffort) || input.overallEffort < 1 || input.overallEffort > 10)) {
        throw new WorkoutServiceError('L’effort global doit être entre 1 et 10.', 'VALIDATION')
      }
      const rows = await db.workoutExercises.where('workoutSessionId').equals(sessionId).toArray()
      const allSets = await db.workoutSets.where('workoutExerciseId').anyOf(rows.map(row => row.id)).toArray()
      if (!allSets.some(set => set.status === 'validee')) throw new WorkoutServiceError('Valide au moins une série avant de terminer la séance.', 'VALIDATION')
      for (const row of rows) {
        const sets = allSets.filter(set => set.workoutExerciseId === row.id)
        await db.workoutSets.where('workoutExerciseId').equals(row.id).and(set => set.status === 'en_saisie').delete()
        await db.workoutExercises.update(row.id, { status: sets.some(set => set.status === 'validee') ? 'termine' : 'ignore' })
      }
      const now = nowIso()
      const finished: WorkoutSession = {
        ...session, status: 'terminee', endedAt: now, updatedAt: now,
        overallEffort: input.overallEffort, notes: (input.notes ?? '').trim().slice(0, 1000),
      }
      await db.workoutSessions.put(finished)
      return finished
    })
  },

  async interrupt(sessionId: string): Promise<void> {
    await db.transaction('rw', db.workoutSessions, async () => {
      const session = await db.workoutSessions.get(sessionId)
      if (!session || session.userId !== LOCAL_USER_ID) throw new WorkoutServiceError('Cette séance est introuvable.', 'NOT_FOUND')
      if (session.status !== 'en_cours') throw new WorkoutServiceError('Seule une séance en cours peut être mise en pause.', 'VALIDATION')
      await db.workoutSessions.update(sessionId, { status: 'interrompue', updatedAt: nowIso() })
    })
  },

  async cancel(sessionId: string): Promise<void> {
    await db.transaction('rw', db.workoutSessions, db.workoutExercises, db.workoutSets, async () => {
      const session = await db.workoutSessions.get(sessionId)
      if (!session || session.userId !== LOCAL_USER_ID) throw new WorkoutServiceError('Cette séance est introuvable.', 'NOT_FOUND')
      if (session.status !== 'en_cours' && session.status !== 'interrompue') throw new WorkoutServiceError('Cette séance ne peut plus être annulée.', 'VALIDATION')
      const exercises = await db.workoutExercises.where('workoutSessionId').equals(sessionId).toArray()
      for (const row of exercises) {
        await db.workoutSets.where('workoutExerciseId').equals(row.id).and(set => set.status === 'en_saisie').delete()
        await db.workoutExercises.update(row.id, { status: 'ignore' })
      }
      const now = nowIso()
      await db.workoutSessions.update(sessionId, { status: 'annulee', endedAt: now, updatedAt: now })
    })
  },
}

export function calculateSessionVolume(sets: WorkoutSet[]): number {
  return sets.filter(set => set.status === 'validee' && set.setType === 'travail')
    .reduce((sum, set) => sum + set.loadValue * set.repetitions, 0)
}

export function validatePrescription(prescription: ProgramExercise): void {
  if (prescription.targetSets < 1 || prescription.maxReps < prescription.minReps) {
    throw new WorkoutServiceError('La prescription de cette journée est invalide.', 'VALIDATION')
  }
}
