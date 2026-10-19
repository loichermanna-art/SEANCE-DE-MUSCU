import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Exercise } from '../domain/types'
import { LOCAL_USER_ID } from '../domain/types'
import { db } from './db'
import { programExerciseService } from './programExerciseService'
import { programService } from './programService'
import { workoutService } from './workoutService'

const squat: Exercise = {
  id: 'workout-squat', name: 'Squat avant test', equipment: 'barre', movementType: 'jambes', difficulty: 2,
  description: '', instructions: '', isCustom: false, createdAt: '2026-01-01T00:00:00.000Z',
}
const rowExercise: Exercise = {
  ...squat, id: 'workout-row', name: 'Row test', movementType: 'tirage',
}
let programId = ''
let dayId = ''

beforeEach(async () => {
  await db.transaction('rw', [db.programs, db.programDays, db.programExercises, db.workoutSessions,
    db.workoutExercises, db.workoutSets, db.exercises, db.userPreferences], async () => {
      await db.workoutSets.clear()
      await db.userPreferences.clear()
      await db.workoutExercises.clear()
      await db.workoutSessions.clear()
      await db.programExercises.clear()
      await db.programDays.clear()
      await db.programs.clear()
      await db.exercises.put(squat)
      await db.exercises.put(rowExercise)
    })
  const program = await programService.createProgram({ name: 'Programme jambes', objective: '', status: 'actif' })
  const day = await programService.createDay(program.id, { name: 'Jambes', notes: '' })
  programId = program.id
  dayId = day.id
  await programExerciseService.add(day.id, {
    exerciseId: squat.id, targetSets: 3, minReps: 8, maxReps: 12, targetLoad: 60, restSeconds: 120,
  })
})

describe('workout session persistence', () => {
  it('starts from a planned day with immutable snapshots and prefilled target sets', async () => {
    const detail = await workoutService.startFromDay(dayId)
    expect(detail.session).toMatchObject({ status: 'en_cours', programId, programDayId: dayId, name: 'Programme jambes · Jambes' })
    expect(detail.exercises[0]).toMatchObject({ exerciseId: squat.id, exerciseNameSnapshot: squat.name, targetSetsSnapshot: 3, minRepsSnapshot: 8, maxRepsSnapshot: 12, targetLoadSnapshot: 60, restSecondsSnapshot: 120 })
    expect(detail.exercises[0].sets).toHaveLength(3)
    expect(detail.exercises[0].sets[0]).toMatchObject({ loadValue: 60, repetitions: 8, status: 'en_saisie', setNumber: 1 })
    await db.exercises.update(squat.id, { name: 'Nouveau nom' })
    expect((await workoutService.getSession(detail.session.id))?.exercises[0].exerciseNameSnapshot).toBe('Squat avant test')
  })

  it('respects the selected target-load unit and snapshots the prescription', async () => {
    await db.userPreferences.put({ id: 'unit-pref', userId: LOCAL_USER_ID, unitSystem: 'lb', defaultRestSeconds: 75, theme: 'sombre' })
    const plan = await db.programExercises.where('programDayId').equals(dayId).first()
    await programExerciseService.update(plan!.id, { exerciseId: squat.id, targetSets: 3, minReps: 8, maxReps: 12, targetLoad: 135, targetLoadUnit: 'lb', restSeconds: 120 })
    const detail = await workoutService.startFromDay(dayId)
    expect(detail.exercises[0]).toMatchObject({ targetLoadSnapshot: 135, targetLoadUnitSnapshot: 'lb' })
    expect(detail.exercises[0].sets[0]).toMatchObject({ loadValue: 135, loadUnit: 'lb' })
  })

  it('validates each set, persists progress, and finishes while discarding only unvalidated drafts', async () => {
    const detail = await workoutService.startFromDay(dayId)
    const firstSet = detail.exercises[0].sets[0]
    await workoutService.updateSetDraft(firstSet.id, { loadValue: 62.5, loadUnit: 'kg', repetitions: 10, rir: 2 })
    const completed = await workoutService.completeSet(firstSet.id)
    expect(completed).toMatchObject({ status: 'validee', loadValue: 62.5, repetitions: 10, rir: 2 })
    await workoutService.updateSetDraft(detail.exercises[0].sets[1].id, { loadValue: 60, loadUnit: 'kg', repetitions: 0 })
    await expect(workoutService.completeSet(detail.exercises[0].sets[1].id)).rejects.toThrow('Saisis au moins une répétition')

    const finished = await workoutService.finish(detail.session.id, { overallEffort: 7, notes: 'Bonne séance' })
    expect(finished).toMatchObject({ status: 'terminee', overallEffort: 7, notes: 'Bonne séance' })
    expect(await db.workoutSets.where('workoutExerciseId').equals(detail.exercises[0].id).toArray()).toEqual([
      expect.objectContaining({ id: firstSet.id, status: 'validee' }),
    ])
    await expect(workoutService.updateSetDraft(firstSet.id, { loadValue: 70, loadUnit: 'kg', repetitions: 10 })).rejects.toThrow()
  })

  it('prevents an empty workout from being marked complete and supports pause/resume', async () => {
    const detail = await workoutService.startFromDay(dayId)
    await expect(workoutService.finish(detail.session.id)).rejects.toThrow('Valide au moins une série')
    await workoutService.interrupt(detail.session.id)
    expect((await workoutService.getActiveSession())?.session.status).toBe('interrompue')
    const resumed = await workoutService.resume(detail.session.id)
    expect(resumed.session.status).toBe('en_cours')
    await expect(workoutService.startFree()).rejects.toMatchObject({ code: 'ACTIVE_SESSION' })
  })

  it('supports a free workout and adds exercise snapshots with editable sets', async () => {
    const free = await workoutService.startFree()
    const exercise = await workoutService.addExercise(free.session.id, rowExercise.id)
    expect(exercise).toMatchObject({ exerciseNameSnapshot: 'Row test', status: 'en_cours' })
    expect(exercise.sets).toHaveLength(1)
    await expect(workoutService.addExercise(free.session.id, rowExercise.id)).rejects.toThrow('déjà présent')
    await workoutService.updateSetDraft(exercise.sets[0].id, { loadValue: 30, loadUnit: 'kg', repetitions: 12 })
    await workoutService.completeSet(exercise.sets[0].id)
    expect((await workoutService.finish(free.session.id)).status).toBe('terminee')
  })

  it('blocks inactive plans, plans without exercises, and invalid set data', async () => {
    await programService.setStatus(programId, 'pause')
    await expect(workoutService.startFromDay(dayId)).rejects.toMatchObject({ code: 'VALIDATION' })
    await programService.setStatus(programId, 'actif')
    await db.programExercises.clear()
    await expect(workoutService.startFromDay(dayId)).rejects.toThrow('Ajoute au moins un exercice')
    const free = await workoutService.startFree()
    const exercise = await workoutService.addExercise(free.session.id, squat.id)
    await expect(workoutService.updateSetDraft(exercise.sets[0].id, { loadValue: -1, loadUnit: 'kg', repetitions: 10 })).rejects.toMatchObject({ code: 'VALIDATION' })
    expect(await db.workoutSessions.where('userId').equals(LOCAL_USER_ID).count()).toBe(1)
  })
})
