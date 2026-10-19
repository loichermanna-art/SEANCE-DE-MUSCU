import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { MuscleGroup } from '../domain/types'
import { db } from './db'
import { exerciseService, type CustomExerciseInput } from './exerciseService'

const group: MuscleGroup = { id: 'custom-chest', name: 'Pectoraux' }
const secondGroup: MuscleGroup = { id: 'custom-back', name: 'Dos' }
const custom = (patch: Partial<CustomExerciseInput> = {}): CustomExerciseInput => ({
  name: 'Développé au sol personnalisé', equipment: 'halteres', movementType: 'poussee', difficulty: 1,
  description: 'Poussée contrôlée.', instructions: 'Garde les coudes contrôlés.', muscles: [{ muscleGroupId: group.id, role: 'principal' }], ...patch,
})

beforeEach(async () => {
  await db.transaction('rw', [db.exercises, db.exerciseMuscles, db.muscleGroups, db.programExercises, db.workoutExercises], async () => {
    await db.exercises.clear(); await db.exerciseMuscles.clear(); await db.muscleGroups.clear(); await db.programExercises.clear(); await db.workoutExercises.clear()
    await db.muscleGroups.bulkPut([group, secondGroup])
  })
})

describe('custom exercise library', () => {
  it('creates and updates an exercise with primary and secondary muscle links', async () => {
    const created = await exerciseService.saveCustom(custom({ muscles: [
      { muscleGroupId: group.id, role: 'principal' }, { muscleGroupId: 'custom-back', role: 'secondaire' },
    ] }))
    expect(created).toMatchObject({ isCustom: true, name: 'Développé au sol personnalisé' })
    expect(await db.exerciseMuscles.where('exerciseId').equals(created.id).count()).toBe(2)
    const updated = await exerciseService.saveCustom({ ...custom({ id: created.id, name: 'Développé personnalisé modifié' }), id: created.id })
    expect(updated.name).toBe('Développé personnalisé modifié')
    expect(await db.exerciseMuscles.where('exerciseId').equals(created.id).count()).toBe(1)
  })

  it('rejects missing required fields, invalid difficulty, and unknown muscles atomically', async () => {
    await expect(exerciseService.saveCustom(custom({ name: ' ' }))).rejects.toThrow(/nom est obligatoire/)
    await expect(exerciseService.saveCustom(custom({ difficulty: 4 as 1 | 2 | 3 }))).rejects.toThrow(/difficulté/)
    await expect(exerciseService.saveCustom(custom({ muscles: [{ muscleGroupId: 'missing', role: 'principal' }] }))).rejects.toThrow(/introuvable/)
    expect(await db.exercises.count()).toBe(0)
  })

  it('protects planned exercises and detaches deleted custom exercises from immutable history', async () => {
    const exercise = await exerciseService.saveCustom(custom())
    await db.programExercises.put({ id: 'plan-custom', programDayId: 'day-custom', exerciseId: exercise.id, exerciseOrder: 1, targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 })
    await expect(exerciseService.deleteCustom(exercise.id)).rejects.toMatchObject({ code: 'IN_USE' })
    await db.programExercises.delete('plan-custom')
    await db.workoutExercises.put({ id: 'history-custom', workoutSessionId: 'session-custom', exerciseId: exercise.id, exerciseNameSnapshot: exercise.name, exerciseOrder: 1, status: 'termine' })
    await exerciseService.deleteCustom(exercise.id)
    expect(await db.exercises.get(exercise.id)).toBeUndefined()
    const historical = await db.workoutExercises.get('history-custom')
    expect(historical?.exerciseNameSnapshot).toBe(exercise.name)
    expect(historical).not.toHaveProperty('exerciseId')
  })
})
