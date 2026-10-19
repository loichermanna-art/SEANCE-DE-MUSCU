import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { GymOSDatabase } from './db'

const VERSION_ONE_SCHEMA = {
  profiles: 'id, updatedAt',
  goals: 'id, userId, status',
  exercises: 'id, name, isCustom',
  muscleGroups: 'id, name',
  exerciseMuscles: 'id, exerciseId, muscleGroupId',
  programs: 'id, userId, status, updatedAt',
  programDays: 'id, programId, dayOrder',
  programExercises: 'id, programDayId, exerciseId, exerciseOrder',
  workoutSessions: 'id, userId, status, startedAt, programDayId',
  workoutExercises: 'id, workoutSessionId, exerciseId, exerciseOrder',
  workoutSets: 'id, workoutExerciseId, status',
  recoveryCheckins: 'id, userId, recordedAt',
  muscleSoreness: 'id, recoveryCheckinId, muscleGroupId',
  bodyMeasurements: 'id, userId, measurementType, measuredAt',
  userPreferences: 'id, userId',
}

describe('Dexie DEMO-01 migration', () => {
  it('preserves existing exercise records and adds the demonstrations store on v1 to v2 upgrade', async () => {
    const databaseName = `gym-os-migration-${crypto.randomUUID()}`
    const legacy = new Dexie(databaseName)
    legacy.version(1).stores(VERSION_ONE_SCHEMA)
    await legacy.open()
    const existingExercise = {
      id: 'test-squat', name: 'Squat', equipment: 'barre', movementType: 'jambes', difficulty: 2,
      description: 'Test', instructions: 'Test', isCustom: false, createdAt: '2026-10-19T00:00:00.000Z',
    }
    await legacy.table('exercises').put(existingExercise)
    legacy.close()

    const upgraded = new GymOSDatabase(databaseName)
    try {
      await upgraded.open()
      expect(upgraded.verno).toBe(2)
      expect(await upgraded.exercises.get(existingExercise.id)).toEqual(existingExercise)
      expect(await upgraded.exerciseDemonstrations.count()).toBe(0)
      expect(upgraded.exerciseDemonstrations.schema.indexes.map((index) => index.name)).toContain('[exerciseId+variantKey]')
    } finally {
      await upgraded.delete()
    }
  })
})
