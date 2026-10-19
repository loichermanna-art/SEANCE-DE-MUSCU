import type { MuscleGroup, MuscleSoreness, PainType, RecoveryCheckin } from '../domain/types'
import { LOCAL_USER_ID } from '../domain/types'
import { evaluateRecovery, type RecoveryAdvice } from '../domain/recovery'
import { db, newId, nowIso } from './db'

export type RecoveryInput = Pick<RecoveryCheckin, 'energyLevel' | 'sleepDurationHours' | 'sleepQuality' | 'generalFatigue' | 'notes'>
export interface SorenessInput { muscleGroupId: string; severity: 0 | 1 | 2 | 3 | 4; painType: PainType; notes?: string }
export interface RecoveryRecord {
  checkin: RecoveryCheckin
  soreness: Array<MuscleSoreness & { muscleName: string }>
  advice: RecoveryAdvice
}

export class RecoveryServiceError extends Error {
  constructor(message: string, public readonly code: 'VALIDATION' | 'NOT_FOUND') {
    super(message)
    this.name = 'RecoveryServiceError'
  }
}

function boundedOptional(value: number | undefined, min: number, max: number, label: string, integer = true) {
  if (value === undefined) return undefined
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new RecoveryServiceError(`${label} doit être entre ${min} et ${max}${integer ? ', sans décimale' : ''}.`, 'VALIDATION')
  }
  return value
}

export function validateRecoveryInput(input: RecoveryInput): RecoveryInput {
  const energyLevel = boundedOptional(input.energyLevel, 1, 5, 'L’énergie')
  const sleepDurationHours = boundedOptional(input.sleepDurationHours, 0, 24, 'La durée de sommeil', false)
  const sleepQuality = boundedOptional(input.sleepQuality, 1, 5, 'La qualité du sommeil')
  const generalFatigue = boundedOptional(input.generalFatigue, 1, 5, 'La fatigue')
  const notes = (input.notes ?? '').trim()
  if (notes.length > 1000) throw new RecoveryServiceError('La note ne doit pas dépasser 1000 caractères.', 'VALIDATION')
  return { energyLevel, sleepDurationHours, sleepQuality, generalFatigue, notes }
}

function validSoreness(input: SorenessInput) {
  if (!input.muscleGroupId.trim()) throw new RecoveryServiceError('Un groupe musculaire est obligatoire.', 'VALIDATION')
  if (![0, 1, 2, 3, 4].includes(input.severity)) throw new RecoveryServiceError('L’intensité doit être entre 0 et 4.', 'VALIDATION')
  if (input.painType !== 'courbature' && input.painType !== 'douleur_inhabituelle') throw new RecoveryServiceError('Type de gêne invalide.', 'VALIDATION')
  const notes = (input.notes ?? '').trim()
  if (notes.length > 300) throw new RecoveryServiceError('La note musculaire ne doit pas dépasser 300 caractères.', 'VALIDATION')
  return { ...input, notes }
}

async function dayMuscles(programDayId?: string): Promise<string[]> {
  if (!programDayId) return (await db.muscleGroups.toArray()).map(muscle => muscle.id)
  const day = await db.programDays.get(programDayId)
  if (!day) throw new RecoveryServiceError('Le jour de programme choisi est introuvable.', 'NOT_FOUND')
  const prescriptions = await db.programExercises.where('programDayId').equals(day.id).toArray()
  const links = await db.exerciseMuscles.where('exerciseId').anyOf(prescriptions.map(item => item.exerciseId)).toArray()
  return [...new Set(links.map(link => link.muscleGroupId))]
}

async function adviceFor(soreness: Array<MuscleSoreness & { muscleName: string }>, programDayId?: string) {
  const targetedMuscleIds = await dayMuscles(programDayId)
  return evaluateRecovery({
    soreness: soreness.map(row => ({ muscleGroupId: row.muscleGroupId, muscleName: row.muscleName, severity: row.severity, painType: row.painType })),
    targetedMuscleIds,
  })
}

export const recoveryService = {
  async listMuscleGroups(): Promise<MuscleGroup[]> {
    return (await db.muscleGroups.toArray()).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  },

  async listProgramDays() {
    const programs = (await db.programs.where('userId').equals(LOCAL_USER_ID).toArray()).filter(program => program.status === 'actif')
    const days = await db.programDays.toArray()
    return programs.flatMap(program => days.filter(day => day.programId === program.id).map(day => ({ id: day.id, label: `${program.name} — ${day.name}` })))
  },

  async save(input: RecoveryInput, entries: SorenessInput[], programDayId?: string): Promise<RecoveryRecord> {
    const valid = validateRecoveryInput(input)
    const normalized = entries.map(validSoreness)
    const groups = await db.muscleGroups.toArray()
    if (normalized.some(entry => !groups.some(group => group.id === entry.muscleGroupId))) {
      throw new RecoveryServiceError('Un groupe musculaire sélectionné n’existe plus.', 'NOT_FOUND')
    }
    if (new Set(normalized.map(entry => entry.muscleGroupId)).size !== normalized.length) {
      throw new RecoveryServiceError('Chaque groupe musculaire doit apparaître une seule fois.', 'VALIDATION')
    }
    const muscles = new Set(await dayMuscles(programDayId))
    const checkin: RecoveryCheckin = {
      id: newId(), userId: LOCAL_USER_ID, recordedAt: nowIso(), ...valid,
    }
    const rows: MuscleSoreness[] = normalized.map(entry => ({ id: newId(), recoveryCheckinId: checkin.id, ...entry }))
    await db.transaction('rw', db.recoveryCheckins, db.muscleSoreness, async () => {
      await db.recoveryCheckins.add(checkin)
      if (rows.length) await db.muscleSoreness.bulkAdd(rows)
    })
    const withNames = rows.map(row => ({ ...row, muscleName: groups.find(group => group.id === row.muscleGroupId)?.name ?? row.muscleGroupId }))
    return {
      checkin, soreness: withNames,
      advice: evaluateRecovery({
        soreness: withNames.map(row => ({ muscleGroupId: row.muscleGroupId, muscleName: row.muscleName, severity: row.severity, painType: row.painType })),
        targetedMuscleIds: [...muscles],
      }),
    }
  },

  async listRecent(limit = 5): Promise<RecoveryRecord[]> {
    const checkins = (await db.recoveryCheckins.where('userId').equals(LOCAL_USER_ID).toArray())
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)).slice(0, limit)
    const groups = await db.muscleGroups.toArray()
    return Promise.all(checkins.map(async checkin => {
      const rows = await db.muscleSoreness.where('recoveryCheckinId').equals(checkin.id).toArray()
      const soreness = rows.map(row => ({ ...row, muscleName: groups.find(group => group.id === row.muscleGroupId)?.name ?? row.muscleGroupId }))
      return { checkin, soreness, advice: await adviceFor(soreness) }
    }))
  },
}
