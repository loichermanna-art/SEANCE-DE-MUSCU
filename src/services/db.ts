// GYM OS — Persistance locale IndexedDB via Dexie (§21, Phase 2)
// Base locale = source immédiate d'écriture : aucune saisie n'attend le réseau.
// Le schéma reprend exactement docs/03-modele-de-donnees.md ; la synchronisation
// Supabase (Phase 7) lira ces mêmes tables sans conversion.

import Dexie, { type Table } from 'dexie'
import type {
  Profile, Goal, Exercise, MuscleGroup, ExerciseMuscle, Program, ProgramDay,
  ProgramExercise, WorkoutSession, WorkoutExercise, WorkoutSet, RecoveryCheckin,
  MuscleSoreness, BodyMeasurement, UserPreferences, ExerciseDemonstration,
} from '../domain/types'

export class GymOSDatabase extends Dexie {
  profiles!: Table<Profile, string>
  goals!: Table<Goal, string>
  exercises!: Table<Exercise, string>
  exerciseDemonstrations!: Table<ExerciseDemonstration, string>
  muscleGroups!: Table<MuscleGroup, string>
  exerciseMuscles!: Table<ExerciseMuscle, string>
  programs!: Table<Program, string>
  programDays!: Table<ProgramDay, string>
  programExercises!: Table<ProgramExercise, string>
  workoutSessions!: Table<WorkoutSession, string>
  workoutExercises!: Table<WorkoutExercise, string>
  workoutSets!: Table<WorkoutSet, string>
  recoveryCheckins!: Table<RecoveryCheckin, string>
  muscleSoreness!: Table<MuscleSoreness, string>
  bodyMeasurements!: Table<BodyMeasurement, string>
  userPreferences!: Table<UserPreferences, string>

  constructor() {
    super('gym-os')
    this.version(1).stores({
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
    })
    this.version(2).stores({
      profiles: 'id, updatedAt',
      goals: 'id, userId, status',
      exercises: 'id, name, isCustom',
      exerciseDemonstrations: 'id, exerciseId, status, updatedAt, [exerciseId+variantKey]',
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
    })
  }
}

export const db = new GymOSDatabase()

export function newId(): string {
  return crypto.randomUUID()
}

export function nowIso(): string {
  return new Date().toISOString()
}
