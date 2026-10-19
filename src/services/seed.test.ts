import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildDemonstrationRows } from '../domain/exerciseDemonstrations'
import { db } from './db'
import { seedExerciseDemonstrations, seedIfEmpty } from './seed'

beforeEach(async () => {
  await db.exerciseDemonstrations.clear()
})

describe('exercise demonstration reference seed', () => {
  it('upgrades built-in definitions while preserving unpublished state and custom variants', async () => {
    const canonical = buildDemonstrationRows().find((row) => row.animationKey === 'incline-dumbbell-press')!
    const legacy = { ...canonical, animationVersion: 1, view: 'three_quarter' as const, durationMs: 3200, status: 'brouillon' as const }
    const custom = { ...canonical, id: 'custom:incline-side', variantKey: 'side', animationVersion: 1, durationMs: 4500 }
    await db.exerciseDemonstrations.bulkAdd([legacy, custom])

    await seedExerciseDemonstrations()

    expect(await db.exerciseDemonstrations.get(legacy.id)).toMatchObject({
      animationVersion: 2, view: 'three_quarter', durationMs: 6600, status: 'brouillon',
    })
    expect(await db.exerciseDemonstrations.get(custom.id)).toEqual(custom)
  })

  it('inserts missing built-in demonstrations idempotently', async () => {
    await seedExerciseDemonstrations()
    await seedExerciseDemonstrations()
    expect(await db.exerciseDemonstrations.count()).toBe(14)
  })

  it('completes the reference library even when a partial/custom database already exists', async () => {
    await db.transaction('rw', [db.exercises, db.muscleGroups, db.exerciseMuscles], async () => {
      await db.exercises.clear(); await db.muscleGroups.clear(); await db.exerciseMuscles.clear()
      await db.exercises.add({ id: 'local-only', name: 'Custom local', equipment: 'autre', movementType: 'autre', difficulty: 1, description: '', instructions: '', isCustom: true, createdAt: '2026-01-01T00:00:00.000Z' })
    })
    await seedIfEmpty()
    expect(await db.exercises.get('local-only')).toMatchObject({ isCustom: true })
    expect(await db.exercises.get('squat-barre')).toBeDefined()
    expect(await db.muscleGroups.count()).toBeGreaterThan(0)
    expect(await db.exerciseDemonstrations.count()).toBe(14)
    const count = await db.exercises.count()
    await seedIfEmpty()
    expect(await db.exercises.count()).toBe(count)
  })
})
