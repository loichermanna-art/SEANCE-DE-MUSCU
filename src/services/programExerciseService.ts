import { LOCAL_USER_ID, type Exercise, type ProgramExercise } from '../domain/types'
import { db, newId, nowIso } from './db'
import { ProgramServiceError } from './programService'

export type ProgramExerciseInput = Pick<ProgramExercise,
  'exerciseId' | 'targetSets' | 'minReps' | 'maxReps' | 'targetLoad' | 'targetLoadUnit' | 'restSeconds' | 'notes'
>
export type ProgramExerciseView = ProgramExercise & { exercise: Exercise }

function requiredInteger(value: number, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ProgramServiceError(`${label} doit être un entier entre ${min} et ${max}.`, 'VALIDATION')
  }
  return value
}

function optionalText(value: string | undefined, max: number): string {
  const text = (value ?? '').trim()
  if (text.length > max) throw new ProgramServiceError(`La note ne doit pas dépasser ${max} caractères.`, 'VALIDATION')
  return text
}

export function validateProgramExercise(input: ProgramExerciseInput): ProgramExerciseInput {
  if (typeof input.exerciseId !== 'string' || !input.exerciseId.trim()) {
    throw new ProgramServiceError('Choisis un exercice.', 'VALIDATION')
  }
  const targetSets = requiredInteger(input.targetSets, 'Le nombre de séries', 1, 20)
  const minReps = requiredInteger(input.minReps, 'Le minimum de répétitions', 1, 100)
  const maxReps = requiredInteger(input.maxReps, 'Le maximum de répétitions', 1, 100)
  if (minReps > maxReps) {
    throw new ProgramServiceError('Le minimum de répétitions ne peut pas dépasser le maximum.', 'VALIDATION')
  }
  const targetLoad = input.targetLoad
  if (targetLoad !== undefined && (!Number.isFinite(targetLoad) || targetLoad < 0 || targetLoad > 1000)) {
    throw new ProgramServiceError('La charge cible doit être entre 0 et 1000, ou laissée vide.', 'VALIDATION')
  }
  if (input.targetLoadUnit !== undefined && input.targetLoadUnit !== 'kg' && input.targetLoadUnit !== 'lb') {
    throw new ProgramServiceError('Choisis une unité valide pour la charge cible.', 'VALIDATION')
  }
  return {
    exerciseId: input.exerciseId.trim(),
    targetSets,
    minReps,
    maxReps,
    targetLoad,
    targetLoadUnit: input.targetLoadUnit ?? 'kg',
    restSeconds: requiredInteger(input.restSeconds, 'Le repos', 0, 3600),
    notes: optionalText(input.notes, 500),
  }
}

function orderRows(rows: ProgramExercise[]): ProgramExercise[] {
  return rows.sort((a, b) => a.exerciseOrder - b.exerciseOrder || a.id.localeCompare(b.id))
}

async function writableDay(programDayId: string) {
  const day = await db.programDays.get(programDayId)
  if (!day) throw new ProgramServiceError('Ce jour de programme est introuvable.', 'NOT_FOUND')
  const program = await db.programs.get(day.programId)
  if (!program || program.userId !== LOCAL_USER_ID) {
    throw new ProgramServiceError('Le programme associé est introuvable.', 'NOT_FOUND')
  }
  if (program.status === 'archive') {
    throw new ProgramServiceError('Restaure le programme avant de modifier ses exercices.', 'VALIDATION')
  }
  return { day, program }
}

async function normalizeOrders(programDayId: string) {
  const rows = orderRows(await db.programExercises.where('programDayId').equals(programDayId).toArray())
  await Promise.all(rows.map((row, index) => db.programExercises.update(row.id, { exerciseOrder: index + 1 })))
  return rows
}

export const programExerciseService = {
  async listLibraryExercises(): Promise<Exercise[]> {
    return (await db.exercises.toArray()).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  },

  async listForDay(programDayId: string): Promise<ProgramExerciseView[]> {
    const rows = orderRows(await db.programExercises.where('programDayId').equals(programDayId).toArray())
    const exercises = await db.exercises.bulkGet(rows.map(row => row.exerciseId))
    return rows.flatMap((row, index) => exercises[index] ? [{ ...row, exercise: exercises[index]! }] : [])
  },

  async add(programDayId: string, input: ProgramExerciseInput): Promise<ProgramExercise> {
    const valid = validateProgramExercise(input)
    return db.transaction('rw', db.programs, db.programDays, db.programExercises, db.exercises, async () => {
      const { day, program } = await writableDay(programDayId)
      const exercise = await db.exercises.get(valid.exerciseId)
      if (!exercise) throw new ProgramServiceError('Cet exercice n’existe plus dans la bibliothèque.', 'NOT_FOUND')
      const existing = orderRows(await db.programExercises.where('programDayId').equals(day.id).toArray())
      if (existing.some(row => row.exerciseId === valid.exerciseId)) {
        throw new ProgramServiceError('Cet exercice est déjà ajouté à cette journée.', 'VALIDATION')
      }
      const row: ProgramExercise = { id: newId(), programDayId, ...valid, exerciseOrder: existing.length + 1 }
      await db.programExercises.add(row)
      await db.programs.update(program.id, { updatedAt: nowIso() })
      return row
    })
  },

  async update(id: string, input: ProgramExerciseInput): Promise<ProgramExercise> {
    const valid = validateProgramExercise(input)
    return db.transaction('rw', db.programs, db.programDays, db.programExercises, db.exercises, async () => {
      const existing = await db.programExercises.get(id)
      if (!existing) throw new ProgramServiceError('Cette prescription est introuvable.', 'NOT_FOUND')
      const { day, program } = await writableDay(existing.programDayId)
      if (!(await db.exercises.get(valid.exerciseId))) {
        throw new ProgramServiceError('Cet exercice n’existe plus dans la bibliothèque.', 'NOT_FOUND')
      }
      const duplicate = await db.programExercises.where('programDayId').equals(day.id).filter(row => row.id !== id && row.exerciseId === valid.exerciseId).first()
      if (duplicate) throw new ProgramServiceError('Cet exercice est déjà ajouté à cette journée.', 'VALIDATION')
      const updated = { ...existing, ...valid }
      await db.programExercises.put(updated)
      await db.programs.update(program.id, { updatedAt: nowIso() })
      return updated
    })
  },

  async move(id: string, direction: -1 | 1): Promise<void> {
    await db.transaction('rw', db.programs, db.programDays, db.programExercises, async () => {
      const row = await db.programExercises.get(id)
      if (!row) throw new ProgramServiceError('Cette prescription est introuvable.', 'NOT_FOUND')
      const { day, program } = await writableDay(row.programDayId)
      const rows = orderRows(await db.programExercises.where('programDayId').equals(day.id).toArray())
      const index = rows.findIndex(item => item.id === id)
      const target = index + direction
      if (target >= 0 && target < rows.length) [rows[index], rows[target]] = [rows[target], rows[index]]
      await Promise.all(rows.map((item, order) => db.programExercises.update(item.id, { exerciseOrder: order + 1 })))
      await db.programs.update(program.id, { updatedAt: nowIso() })
    })
  },

  async remove(id: string): Promise<void> {
    await db.transaction('rw', db.programs, db.programDays, db.programExercises, async () => {
      const row = await db.programExercises.get(id)
      if (!row) throw new ProgramServiceError('Cette prescription est introuvable.', 'NOT_FOUND')
      const { day, program } = await writableDay(row.programDayId)
      await db.programExercises.delete(id)
      await normalizeOrders(day.id)
      await db.programs.update(program.id, { updatedAt: nowIso() })
    })
  },
}
