import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Exercise, MuscleGroup } from '../domain/types'
import { db } from './db'
import { programService } from './programService'
import { recoveryService, validateRecoveryInput } from './recoveryService'

const muscles: MuscleGroup[] = [
  { id: 'pectoraux', name: 'Pectoraux' },
  { id: 'quadriceps', name: 'Quadriceps' },
]
const exercise: Exercise = {
  id: 'recovery-press', name: 'Développé test', equipment: 'barre', movementType: 'poussee', difficulty: 2,
  description: '', instructions: '', isCustom: false, createdAt: '2026-01-01T00:00:00.000Z',
}
let dayId = ''

beforeEach(async () => {
  await db.transaction('rw', [db.muscleGroups, db.exercises, db.exerciseMuscles, db.programs, db.programDays, db.programExercises, db.recoveryCheckins, db.muscleSoreness], async () => {
    await db.recoveryCheckins.clear(); await db.muscleSoreness.clear(); await db.programExercises.clear(); await db.programDays.clear(); await db.programs.clear(); await db.exerciseMuscles.clear(); await db.exercises.put(exercise); await db.muscleGroups.bulkPut(muscles)
    await db.exerciseMuscles.put({ id: 'recovery-press:pectoraux', exerciseId: exercise.id, muscleGroupId: 'pectoraux', role: 'principal' })
  })
  const program = await programService.createProgram({ name: 'Haut du corps', objective: '', status: 'actif' })
  dayId = (await programService.createDay(program.id, { name: 'Poussée', notes: '' })).id
  await db.programExercises.put({ id: 'recovery-planned-press', programDayId: dayId, exerciseId: exercise.id, exerciseOrder: 1, targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 })
})

describe('recovery check-ins', () => {
  it('validates optional energy, sleep, fatigue, and note bounds', () => {
    expect(validateRecoveryInput({ energyLevel: 4, sleepDurationHours: 7.5, sleepQuality: 3, generalFatigue: 2 }).sleepDurationHours).toBe(7.5)
    expect(() => validateRecoveryInput({ energyLevel: 6 })).toThrow(/énergie/)
    expect(() => validateRecoveryInput({ sleepDurationHours: 25 })).toThrow(/sommeil/)
    expect(() => validateRecoveryInput({ notes: 'x'.repeat(1001) })).toThrow(/1000 caractères/)
  })

  it('saves a check-in locally and evaluates soreness against the selected day muscles', async () => {
    const saved = await recoveryService.save({ energyLevel: 3, sleepDurationHours: 6.5, sleepQuality: 2, generalFatigue: 3, notes: 'Nuit courte' }, [
      { muscleGroupId: 'pectoraux', severity: 3, painType: 'courbature' },
      { muscleGroupId: 'quadriceps', severity: 3, painType: 'courbature' },
    ], dayId)
    expect(saved.advice.situation).toBe('D')
    expect(saved.advice.reasons).toEqual(['Pectoraux : courbatures 3/4'])
    expect(saved.checkin).toMatchObject({ energyLevel: 3, sleepDurationHours: 6.5, notes: 'Nuit courte' })
    expect((await recoveryService.listRecent())[0]).toMatchObject({ checkin: { id: saved.checkin.id }, soreness: expect.arrayContaining([expect.objectContaining({ muscleName: 'Quadriceps' })]) })
  })

  it('raises a transparent caution on unusual pain and rejects duplicate groups', async () => {
    const saved = await recoveryService.save({}, [{ muscleGroupId: 'quadriceps', severity: 2, painType: 'douleur_inhabituelle' }], dayId)
    expect(saved.advice.situation).toBe('E')
    expect(saved.advice.medicalWarning).toBe(true)
    await expect(recoveryService.save({}, [
      { muscleGroupId: 'pectoraux', severity: 1, painType: 'courbature' },
      { muscleGroupId: 'pectoraux', severity: 2, painType: 'courbature' },
    ])).rejects.toMatchObject({ code: 'VALIDATION' })
  })
})
