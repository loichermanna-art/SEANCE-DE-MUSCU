import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Exercise, MuscleGroup, Program, ProgramDay, ProgramExercise, Profile } from '../domain/types'
import { LOCAL_USER_ID } from '../domain/types'
import { db } from './db'
import { exportAllData, importAllData } from './backupService'

const builtin: Exercise = {
  id: 'backup-builtin', name: 'Exercice intégré', equipment: 'barre', movementType: 'poussee', difficulty: 2,
  description: '', instructions: '', isCustom: false, createdAt: '2026-01-01T00:00:00.000Z',
}
const muscles: MuscleGroup[] = [{ id: 'backup-pectoraux', name: 'Pectoraux' }]
const profile: Profile = {
  id: 'backup-profile', displayName: 'Alex', experienceLevel: 'debutant', trainingPreferences: '',
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}

beforeEach(async () => {
  await db.transaction('rw', [db.profiles, db.goals, db.programs, db.programDays, db.programExercises, db.workoutSessions, db.workoutExercises, db.workoutSets, db.recoveryCheckins, db.muscleSoreness, db.bodyMeasurements, db.exercises, db.exerciseMuscles, db.userPreferences, db.muscleGroups], async () => {
    await db.profiles.clear(); await db.goals.clear(); await db.programs.clear(); await db.programDays.clear(); await db.programExercises.clear()
    await db.workoutSessions.clear(); await db.workoutExercises.clear(); await db.workoutSets.clear(); await db.recoveryCheckins.clear()
    await db.muscleSoreness.clear(); await db.bodyMeasurements.clear(); await db.exerciseMuscles.clear()
    await db.exercises.clear(); await db.muscleGroups.clear(); await db.userPreferences.clear()
    await db.exercises.put(builtin); await db.muscleGroups.bulkPut(muscles)
  })
})

async function seedPersonalData() {
  const program: Program = { id: 'backup-program', userId: LOCAL_USER_ID, name: 'Force', objective: '', status: 'actif', createdAt: profile.createdAt, updatedAt: profile.updatedAt }
  const day: ProgramDay = { id: 'backup-day', programId: program.id, name: 'Haut du corps', dayOrder: 1 }
  const planned: ProgramExercise = { id: 'backup-plan', programDayId: day.id, exerciseId: builtin.id, exerciseOrder: 1, targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 }
  await db.profiles.put(profile); await db.programs.put(program); await db.programDays.put(day); await db.programExercises.put(planned)
  await db.userPreferences.put({ id: 'backup-prefs', userId: LOCAL_USER_ID, unitSystem: 'kg', defaultRestSeconds: 90, theme: 'sombre' })
}

describe('versioned local backup', () => {
  it('exports and restores all personal records idempotently in merge mode', async () => {
    await seedPersonalData()
    const backup = await exportAllData()
    const document = JSON.parse(backup)
    expect(document).toMatchObject({ app: 'GYM OS', formatVersion: 1 })
    await db.profiles.clear(); await db.programs.clear(); await db.programDays.clear(); await db.programExercises.clear(); await db.userPreferences.clear()
    const counts = await importAllData(backup, 'merge')
    expect(counts.programs).toBe(1)
    expect(await db.profiles.get(profile.id)).toEqual(profile)
    expect(await db.programExercises.get('backup-plan')).toBeDefined()
    expect(await db.userPreferences.get('backup-prefs')).toBeDefined()
    expect(await db.exercises.get(builtin.id)).toEqual(builtin)
    await importAllData(backup, 'merge')
    expect(await db.programs.count()).toBe(1)
  })

  it('rejects malformed or dangling files without leaving partial writes', async () => {
    await seedPersonalData()
    await expect(importAllData('{broken')).rejects.toThrow('JSON valide')
    const backup = JSON.parse(await exportAllData())
    backup.programDays[0].programId = 'missing-program'
    await expect(importAllData(JSON.stringify(backup), 'replace')).rejects.toThrow('programme « missing-program »')
    expect(await db.programs.get('backup-program')).toBeDefined()
    expect(await db.programDays.get('backup-day')).toBeDefined()
  })

  it('refuses a custom exercise id that would overwrite a built-in exercise', async () => {
    const backup = JSON.parse(await exportAllData())
    backup.customExercises.push({ ...builtin, isCustom: true })
    await expect(importAllData(JSON.stringify(backup))).rejects.toThrow('déjà utilisé par la bibliothèque intégrée')
    expect((await db.exercises.get(builtin.id))?.isCustom).toBe(false)
  })
})
