// Service profil (§3) — accès données séparé des composants (§16.2)

import { db, newId, nowIso } from './db'
import { LOCAL_USER_ID, type Goal, type GoalType, type Profile, type UserPreferences } from '../domain/types'

export async function getProfile(): Promise<Profile | undefined> {
  return db.profiles.orderBy('updatedAt').last()
}

export async function saveProfile(input: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Profile> {
  const now = nowIso()
  if (input.id) {
    const existing = await db.profiles.get(input.id)
    if (existing) {
      const updated = { ...existing, ...input, updatedAt: now }
      await db.profiles.put(updated)
      return updated
    }
  }
  const profile: Profile = { ...input, id: newId(), createdAt: now, updatedAt: now }
  await db.profiles.put(profile)
  return profile
}

export async function listGoals(): Promise<Goal[]> {
  const goals = await db.goals.where('userId').equals(LOCAL_USER_ID).toArray()
  return goals.sort((a, b) => a.priority - b.priority)
}

export async function addGoal(goalType: GoalType, description: string): Promise<Goal> {
  const existing = await listGoals()
  const goal: Goal = {
    id: newId(),
    userId: LOCAL_USER_ID,
    goalType,
    description,
    priority: existing.length + 1,
    status: 'actif',
    createdAt: nowIso(),
  }
  await db.goals.put(goal)
  return goal
}

export async function deleteGoal(id: string): Promise<void> {
  await db.goals.delete(id)
}

export async function getPreferences(): Promise<UserPreferences> {
  const existing = await db.userPreferences.where('userId').equals(LOCAL_USER_ID).first()
  if (existing) return existing
  const defaults: UserPreferences = {
    id: newId(), userId: LOCAL_USER_ID, unitSystem: 'kg', defaultRestSeconds: 90, theme: 'sombre',
  }
  await db.userPreferences.put(defaults)
  return defaults
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  await db.userPreferences.put(prefs)
}

/** Export complet des données utilisateur en JSON (§2.2, §18.4) */
export async function exportAllData(): Promise<string> {
  const data = {
    exportedAt: nowIso(),
    app: 'GYM OS',
    profiles: await db.profiles.toArray(),
    goals: await db.goals.toArray(),
    programs: await db.programs.toArray(),
    programDays: await db.programDays.toArray(),
    programExercises: await db.programExercises.toArray(),
    workoutSessions: await db.workoutSessions.toArray(),
    workoutExercises: await db.workoutExercises.toArray(),
    workoutSets: await db.workoutSets.toArray(),
    recoveryCheckins: await db.recoveryCheckins.toArray(),
    muscleSoreness: await db.muscleSoreness.toArray(),
    bodyMeasurements: await db.bodyMeasurements.toArray(),
    customExercises: (await db.exercises.toArray()).filter((e) => e.isCustom),
  }
  return JSON.stringify(data, null, 2)
}
