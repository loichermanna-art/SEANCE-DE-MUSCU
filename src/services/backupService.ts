import type { BodyMeasurement, Exercise, ExerciseMuscle, Goal, MuscleSoreness, Profile, Program, ProgramDay, ProgramExercise, RecoveryCheckin, UserPreferences, WorkoutExercise, WorkoutSession, WorkoutSet } from '../domain/types'
import { LOCAL_USER_ID } from '../domain/types'
import { db, nowIso } from './db'

interface BackupPayload {
  app: 'GYM OS'
  formatVersion: 1
  exportedAt: string
  profiles: Profile[]
  goals: Goal[]
  programs: Program[]
  programDays: ProgramDay[]
  programExercises: ProgramExercise[]
  workoutSessions: WorkoutSession[]
  workoutExercises: WorkoutExercise[]
  workoutSets: WorkoutSet[]
  recoveryCheckins: RecoveryCheckin[]
  muscleSoreness: MuscleSoreness[]
  bodyMeasurements: BodyMeasurement[]
  customExercises: Exercise[]
  customExerciseMuscles: ExerciseMuscle[]
  userPreferences: UserPreferences[]
}

export class BackupServiceError extends Error {
  constructor(message: string) { super(message); this.name = 'BackupServiceError' }
}

const COLLECTIONS = [
  'profiles', 'goals', 'programs', 'programDays', 'programExercises', 'workoutSessions', 'workoutExercises',
  'workoutSets', 'recoveryCheckins', 'muscleSoreness', 'bodyMeasurements', 'customExercises', 'customExerciseMuscles', 'userPreferences',
] as const

type RecordObject = Record<string, unknown>
function object(value: unknown): value is RecordObject { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function text(value: unknown, field: string, optional = false): string {
  if (optional && (value === undefined || value === null)) return ''
  if (typeof value !== 'string' || !value.trim()) throw new BackupServiceError(`Le champ « ${field} » est invalide dans la sauvegarde.`)
  return value
}
function id(value: unknown, field = 'id') { return text(value, field) }
function finite(value: unknown, field: string, min = -Infinity, max = Infinity) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new BackupServiceError(`La valeur « ${field} » est invalide dans la sauvegarde.`)
}
function integer(value: unknown, field: string, min = -Infinity, max = Infinity) {
  finite(value, field, min, max)
  if (!Number.isInteger(value)) throw new BackupServiceError(`La valeur « ${field} » doit être entière dans la sauvegarde.`)
}
function array(value: unknown, name: string): RecordObject[] {
  if (!Array.isArray(value) || value.length > 50000 || value.some(row => !object(row))) {
    throw new BackupServiceError(`La collection « ${name} » est absente ou invalide.`)
  }
  return value
}
function oneOf(value: unknown, allowed: string[], field: string) {
  if (typeof value !== 'string' || !allowed.includes(value)) throw new BackupServiceError(`Le champ « ${field} » est invalide dans la sauvegarde.`)
}
function validateRows(rows: RecordObject[], collection: string) {
  for (const row of rows) id(row.id)
  switch (collection) {
    case 'profiles':
      for (const row of rows) { text(row.displayName, 'displayName'); oneOf(row.experienceLevel, ['debutant', 'intermediaire', 'avance'], 'experienceLevel'); text(row.createdAt, 'createdAt'); text(row.updatedAt, 'updatedAt') }
      break
    case 'goals':
      for (const row of rows) { text(row.description, 'description'); oneOf(row.goalType, ['prise_de_masse', 'force', 'perte_de_masse_grasse', 'recomposition', 'endurance_musculaire', 'regularite', 'groupe_cible', 'condition_generale'], 'goalType'); oneOf(row.status, ['actif', 'atteint', 'abandonne'], 'status'); integer(row.priority, 'priority', 1); }
      break
    case 'programs':
      for (const row of rows) { text(row.name, 'name'); oneOf(row.status, ['actif', 'pause', 'archive'], 'status'); text(row.createdAt, 'createdAt'); text(row.updatedAt, 'updatedAt') }
      break
    case 'programDays':
      for (const row of rows) { id(row.programId, 'programId'); text(row.name, 'name'); integer(row.dayOrder, 'dayOrder', 1); if (row.scheduledWeekday !== undefined) integer(row.scheduledWeekday, 'scheduledWeekday', 1, 7) }
      break
    case 'programExercises':
      for (const row of rows) { id(row.programDayId, 'programDayId'); id(row.exerciseId, 'exerciseId'); integer(row.exerciseOrder, 'exerciseOrder', 1); integer(row.targetSets, 'targetSets', 1, 20); integer(row.minReps, 'minReps', 1, 100); integer(row.maxReps, 'maxReps', row.minReps as number, 100); integer(row.restSeconds, 'restSeconds', 0, 3600); if (row.targetLoad !== undefined) finite(row.targetLoad, 'targetLoad', 0, 1000); if (row.targetLoadUnit !== undefined) oneOf(row.targetLoadUnit, ['kg', 'lb'], 'targetLoadUnit') }
      break
    case 'workoutSessions':
      for (const row of rows) { text(row.name, 'name'); oneOf(row.status, ['planifiee', 'en_cours', 'terminee', 'interrompue', 'annulee'], 'status'); text(row.createdAt, 'createdAt'); text(row.updatedAt, 'updatedAt'); if (row.overallEffort !== undefined) integer(row.overallEffort, 'overallEffort', 1, 10) }
      break
    case 'workoutExercises':
      for (const row of rows) { id(row.workoutSessionId, 'workoutSessionId'); text(row.exerciseNameSnapshot, 'exerciseNameSnapshot'); integer(row.exerciseOrder, 'exerciseOrder', 1); oneOf(row.status, ['en_cours', 'termine', 'ignore', 'remplace'], 'status'); if (row.targetLoadUnitSnapshot !== undefined) oneOf(row.targetLoadUnitSnapshot, ['kg', 'lb'], 'targetLoadUnitSnapshot') }
      break
    case 'workoutSets':
      for (const row of rows) { id(row.workoutExerciseId, 'workoutExerciseId'); integer(row.setNumber, 'setNumber', 1); oneOf(row.setType, ['echauffement', 'travail'], 'setType'); finite(row.loadValue, 'loadValue', 0, 1000); integer(row.repetitions, 'repetitions', 0, 1000); oneOf(row.loadUnit, ['kg', 'lb'], 'loadUnit'); oneOf(row.status, ['en_saisie', 'validee'], 'status') }
      break
    case 'recoveryCheckins':
      for (const row of rows) { text(row.recordedAt, 'recordedAt'); if (row.energyLevel !== undefined) integer(row.energyLevel, 'energyLevel', 1, 5); if (row.sleepDurationHours !== undefined) finite(row.sleepDurationHours, 'sleepDurationHours', 0, 24) }
      break
    case 'muscleSoreness':
      for (const row of rows) { id(row.recoveryCheckinId, 'recoveryCheckinId'); id(row.muscleGroupId, 'muscleGroupId'); integer(row.severity, 'severity', 0, 4); oneOf(row.painType, ['courbature', 'douleur_inhabituelle'], 'painType') }
      break
    case 'bodyMeasurements':
      for (const row of rows) { text(row.measuredAt, 'measuredAt'); text(row.measurementType, 'measurementType'); finite(row.value, 'value', 0.001, 1000); text(row.unit, 'unit') }
      break
    case 'customExercises':
      for (const row of rows) { text(row.name, 'name'); text(row.equipment, 'equipment'); text(row.movementType, 'movementType'); integer(row.difficulty, 'difficulty', 1, 3); if (row.isCustom !== true) throw new BackupServiceError('La sauvegarde contient un exercice non personnalisé dans « customExercises ».') }
      break
    case 'customExerciseMuscles':
      for (const row of rows) { id(row.exerciseId, 'exerciseId'); id(row.muscleGroupId, 'muscleGroupId'); oneOf(row.role, ['principal', 'secondaire'], 'role') }
      break
    case 'userPreferences':
      for (const row of rows) { oneOf(row.unitSystem, ['kg', 'lb'], 'unitSystem'); integer(row.defaultRestSeconds, 'defaultRestSeconds', 0, 3600) }
      break
  }
}

function parseBackup(raw: string): BackupPayload {
  if (raw.length > 25_000_000) throw new BackupServiceError('Le fichier dépasse la taille maximale de 25 Mo.')
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { throw new BackupServiceError('Ce fichier n’est pas un JSON valide.') }
  if (!object(parsed) || parsed.app !== 'GYM OS' || parsed.formatVersion !== 1) {
    throw new BackupServiceError('Cette sauvegarde GYM OS n’est pas reconnue ou sa version n’est pas prise en charge.')
  }
  const payload = Object.fromEntries(COLLECTIONS.map(name => [name, array(parsed[name], name)])) as unknown as BackupPayload
  for (const name of COLLECTIONS) validateRows(payload[name] as unknown as RecordObject[], name)
  return { ...parsed, ...payload } as BackupPayload
}

export async function exportAllData(): Promise<string> {
  const customExercises = (await db.exercises.toArray()).filter(exercise => exercise.isCustom)
  const customIds = new Set(customExercises.map(exercise => exercise.id))
  const payload: BackupPayload = {
    app: 'GYM OS', formatVersion: 1, exportedAt: nowIso(),
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
    customExercises,
    customExerciseMuscles: (await db.exerciseMuscles.toArray()).filter(link => customIds.has(link.exerciseId)),
    userPreferences: await db.userPreferences.toArray(),
  }
  return JSON.stringify(payload, null, 2)
}

export async function importAllData(raw: string, mode: 'merge' | 'replace' = 'merge') {
  const payload = parseBackup(raw)
  const importedExercises = payload.customExercises
  const importedIds = {
    programs: new Set(payload.programs.map(row => row.id)),
    days: new Set(payload.programDays.map(row => row.id)),
    sessions: new Set(payload.workoutSessions.map(row => row.id)),
    workoutExercises: new Set(payload.workoutExercises.map(row => row.id)),
    checkins: new Set(payload.recoveryCheckins.map(row => row.id)),
    exercises: new Set(importedExercises.map(row => row.id)),
  }

  return db.transaction('rw', [db.profiles, db.goals, db.programs, db.programDays, db.programExercises, db.workoutSessions,
    db.workoutExercises, db.workoutSets, db.recoveryCheckins, db.muscleSoreness, db.bodyMeasurements, db.exercises,
    db.exerciseMuscles, db.userPreferences, db.muscleGroups], async () => {
    if (mode === 'replace') {
      const custom = await db.exercises.filter(exercise => exercise.isCustom).toArray()
      const customIds = custom.map(exercise => exercise.id)
      await db.profiles.clear(); await db.goals.where('userId').equals(LOCAL_USER_ID).delete()
      await db.programs.where('userId').equals(LOCAL_USER_ID).delete()
      await db.programDays.clear(); await db.programExercises.clear()
      await db.workoutSessions.where('userId').equals(LOCAL_USER_ID).delete()
      await db.workoutExercises.clear(); await db.workoutSets.clear()
      await db.recoveryCheckins.where('userId').equals(LOCAL_USER_ID).delete()
      await db.muscleSoreness.clear(); await db.bodyMeasurements.where('userId').equals(LOCAL_USER_ID).delete()
      await db.userPreferences.where('userId').equals(LOCAL_USER_ID).delete()
      if (customIds.length) await db.exerciseMuscles.where('exerciseId').anyOf(customIds).delete()
      if (customIds.length) await db.exercises.bulkDelete(customIds)
    }

    const existingPrograms = new Set((await db.programs.where('userId').equals(LOCAL_USER_ID).primaryKeys()).map(String))
    const existingDays = new Set((await db.programDays.toCollection().primaryKeys()).map(String))
    const existingSessions = new Set((await db.workoutSessions.where('userId').equals(LOCAL_USER_ID).primaryKeys()).map(String))
    const existingWorkoutExercises = new Set((await db.workoutExercises.toCollection().primaryKeys()).map(String))
    const existingCheckins = new Set((await db.recoveryCheckins.where('userId').equals(LOCAL_USER_ID).primaryKeys()).map(String))
    const existingExercises = new Set((await db.exercises.toCollection().primaryKeys()).map(String))
    const existingMuscles = new Set((await db.muscleGroups.toCollection().primaryKeys()).map(String))
    const has = (existing: Set<string>, incoming: Set<string>, value: unknown) => typeof value === 'string' && (existing.has(value) || incoming.has(value))
    for (const custom of importedExercises) {
      const existing = await db.exercises.get(custom.id)
      if (existing && !existing.isCustom) throw new BackupServiceError(`L’identifiant d’exercice « ${custom.id} » est déjà utilisé par la bibliothèque intégrée.`)
    }

    for (const row of payload.programDays) if (!has(existingPrograms, importedIds.programs, row.programId)) throw new BackupServiceError(`Le programme « ${row.programId} » référencé dans un jour est absent.`)
    for (const row of payload.programExercises) {
      if (!has(existingDays, importedIds.days, row.programDayId)) throw new BackupServiceError(`Le jour « ${row.programDayId} » référencé dans une prescription est absent.`)
      if (!has(existingExercises, importedIds.exercises, row.exerciseId)) throw new BackupServiceError(`L’exercice « ${row.exerciseId} » référencé dans un programme est absent.`)
    }
    for (const row of payload.workoutSessions) {
      if (row.programId && !has(existingPrograms, importedIds.programs, row.programId)) throw new BackupServiceError(`Le programme « ${row.programId} » référencé dans une séance est absent.`)
      if (row.programDayId && !has(existingDays, importedIds.days, row.programDayId)) throw new BackupServiceError(`Le jour « ${row.programDayId} » référencé dans une séance est absent.`)
    }
    for (const row of payload.workoutExercises) {
      if (!has(existingSessions, importedIds.sessions, row.workoutSessionId)) throw new BackupServiceError(`La séance « ${row.workoutSessionId} » référencée dans un exercice est absente.`)
      if (row.exerciseId && !has(existingExercises, importedIds.exercises, row.exerciseId)) throw new BackupServiceError(`L’exercice « ${row.exerciseId} » référencé dans l’historique est absent.`)
    }
    for (const row of payload.workoutSets) if (!has(existingWorkoutExercises, importedIds.workoutExercises, row.workoutExerciseId)) throw new BackupServiceError(`L’exercice de séance « ${row.workoutExerciseId} » référencé dans une série est absent.`)
    for (const row of payload.muscleSoreness) {
      if (!has(existingCheckins, importedIds.checkins, row.recoveryCheckinId)) throw new BackupServiceError(`Le bilan « ${row.recoveryCheckinId} » référencé par une gêne est absent.`)
      if (!existingMuscles.has(String(row.muscleGroupId))) throw new BackupServiceError(`Le groupe musculaire « ${row.muscleGroupId} » n’existe pas dans cette bibliothèque.`)
    }
    for (const row of payload.customExerciseMuscles) {
      if (!has(existingExercises, importedIds.exercises, row.exerciseId)) throw new BackupServiceError(`L’exercice personnalisé « ${row.exerciseId} » est absent.`)
      if (!existingMuscles.has(String(row.muscleGroupId))) throw new BackupServiceError(`Le groupe musculaire « ${row.muscleGroupId} » n’existe pas.`)
    }

    await db.exercises.bulkPut(importedExercises)
    await db.exerciseMuscles.bulkPut(payload.customExerciseMuscles)
    await db.profiles.bulkPut(payload.profiles)
    await db.goals.bulkPut(payload.goals.map(row => ({ ...row, userId: LOCAL_USER_ID })))
    await db.programs.bulkPut(payload.programs.map(row => ({ ...row, userId: LOCAL_USER_ID })))
    await db.programDays.bulkPut(payload.programDays)
    await db.programExercises.bulkPut(payload.programExercises)
    await db.workoutSessions.bulkPut(payload.workoutSessions.map(row => ({ ...row, userId: LOCAL_USER_ID })))
    await db.workoutExercises.bulkPut(payload.workoutExercises)
    await db.workoutSets.bulkPut(payload.workoutSets)
    await db.recoveryCheckins.bulkPut(payload.recoveryCheckins.map(row => ({ ...row, userId: LOCAL_USER_ID })))
    await db.muscleSoreness.bulkPut(payload.muscleSoreness)
    await db.bodyMeasurements.bulkPut(payload.bodyMeasurements.map(row => ({ ...row, userId: LOCAL_USER_ID })))
    await db.userPreferences.bulkPut(payload.userPreferences.map(row => ({ ...row, userId: LOCAL_USER_ID })))
    return Object.fromEntries(COLLECTIONS.map(name => [name, payload[name].length]))
  })
}
