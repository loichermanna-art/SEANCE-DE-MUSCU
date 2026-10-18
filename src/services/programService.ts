import type { Program, ProgramDay, ProgramStatus } from '../domain/types'
import { LOCAL_USER_ID } from '../domain/types'
import { db, newId, nowIso } from './db'

export class ProgramServiceError extends Error {
  constructor(message: string, public readonly code: 'NOT_FOUND' | 'VALIDATION' | 'HISTORY_PROTECTED' | 'STORAGE') {
    super(message)
    this.name = 'ProgramServiceError'
  }
}

export type ProgramInput = Pick<Program, 'name' | 'objective' | 'status'>
export type ProgramDayInput = Pick<ProgramDay, 'name'> & Pick<ProgramDay, 'scheduledWeekday' | 'notes'>

function requiredText(value: string, label: string, max: number): string {
  const trimmed = value.trim()
  if (!trimmed) throw new ProgramServiceError(`${label} est obligatoire.`, 'VALIDATION')
  if (trimmed.length > max) throw new ProgramServiceError(`${label} ne doit pas dépasser ${max} caractères.`, 'VALIDATION')
  return trimmed
}

function optionalText(value: string | undefined, max: number, label: string): string {
  const trimmed = (value ?? '').trim()
  if (trimmed.length > max) throw new ProgramServiceError(`${label} ne doit pas dépasser ${max} caractères.`, 'VALIDATION')
  return trimmed
}

export function validateProgram(input: ProgramInput): ProgramInput {
  if (!(['actif', 'pause', 'archive'] as ProgramStatus[]).includes(input.status)) {
    throw new ProgramServiceError('Statut de programme invalide.', 'VALIDATION')
  }
  return {
    name: requiredText(input.name, 'Le nom du programme', 80),
    objective: optionalText(input.objective, 240, "L'objectif"),
    status: input.status,
  }
}

export function validateDay(input: ProgramDayInput): ProgramDayInput {
  if (input.scheduledWeekday !== undefined && (!Number.isInteger(input.scheduledWeekday) || input.scheduledWeekday < 1 || input.scheduledWeekday > 7)) {
    throw new ProgramServiceError('Choisis un jour de semaine valide.', 'VALIDATION')
  }
  return {
    name: requiredText(input.name, 'Le nom du jour', 60),
    scheduledWeekday: input.scheduledWeekday,
    notes: optionalText(input.notes, 500, 'La note'),
  }
}

export const programService = {
  async listPrograms(): Promise<Array<Program & { daysCount: number }>> {
    const programs = await db.programs.where('userId').equals(LOCAL_USER_ID).toArray()
    const days = await db.programDays.toArray()
    return programs
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(program => ({ ...program, daysCount: days.filter(day => day.programId === program.id).length }))
  },

  async getProgram(id: string): Promise<Program | undefined> {
    return db.programs.get(id)
  },

  async listDays(programId: string): Promise<ProgramDay[]> {
    return (await db.programDays.where('programId').equals(programId).toArray()).sort((a, b) => a.dayOrder - b.dayOrder)
  },

  async createProgram(input: ProgramInput): Promise<Program> {
    const valid = validateProgram(input)
    const now = nowIso()
    const program: Program = { id: newId(), userId: LOCAL_USER_ID, ...valid, createdAt: now, updatedAt: now }
    await db.programs.add(program)
    return program
  },

  async updateProgram(id: string, input: ProgramInput): Promise<Program> {
    const valid = validateProgram(input)
    const existing = await db.programs.get(id)
    if (!existing || existing.userId !== LOCAL_USER_ID) throw new ProgramServiceError('Ce programme est introuvable. Actualise la liste.', 'NOT_FOUND')
    const updated = { ...existing, ...valid, updatedAt: nowIso() }
    await db.programs.put(updated)
    return updated
  },

  async setStatus(id: string, status: ProgramStatus): Promise<void> {
    const program = await db.programs.get(id)
    if (!program || program.userId !== LOCAL_USER_ID) throw new ProgramServiceError('Ce programme est introuvable.', 'NOT_FOUND')
    await db.programs.update(id, { status, updatedAt: nowIso() })
  },

  async deleteProgram(id: string): Promise<void> {
    await db.transaction('rw', db.programs, db.programDays, db.programExercises, db.workoutSessions, async () => {
      const program = await db.programs.get(id)
      if (!program || program.userId !== LOCAL_USER_ID) throw new ProgramServiceError('Ce programme est introuvable.', 'NOT_FOUND')
      const days = await db.programDays.where('programId').equals(id).toArray()
      const dayIds = new Set(days.map(day => day.id))
      const sessions = await db.workoutSessions.toArray()
      if (sessions.some(session => session.programId === id || (session.programDayId && dayIds.has(session.programDayId)))) {
        throw new ProgramServiceError("Ce programme est référencé par l'historique. Archive-le plutôt que de le supprimer.", 'HISTORY_PROTECTED')
      }
      await db.programExercises.where('programDayId').anyOf([...dayIds]).delete()
      await db.programDays.where('programId').equals(id).delete()
      await db.programs.delete(id)
    })
  },

  async createDay(programId: string, input: ProgramDayInput): Promise<ProgramDay> {
    const valid = validateDay(input)
    const program = await db.programs.get(programId)
    if (!program || program.userId !== LOCAL_USER_ID) throw new ProgramServiceError('Ce programme est introuvable.', 'NOT_FOUND')
    if (program.status === 'archive') throw new ProgramServiceError('Restaure le programme avant de modifier ses jours.', 'VALIDATION')
    return db.transaction('rw', db.programDays, async () => {
      const days = await db.programDays.where('programId').equals(programId).toArray()
      const day: ProgramDay = { id: newId(), programId, ...valid, dayOrder: days.length + 1 }
      await db.programDays.add(day)
      return day
    })
  },

  async updateDay(id: string, input: ProgramDayInput): Promise<ProgramDay> {
    const valid = validateDay(input)
    const day = await db.programDays.get(id)
    if (!day) throw new ProgramServiceError('Ce jour est introuvable. Actualise le programme.', 'NOT_FOUND')
    const program = await db.programs.get(day.programId)
    if (!program) throw new ProgramServiceError('Le programme associé est introuvable.', 'NOT_FOUND')
    if (program.status === 'archive') throw new ProgramServiceError('Restaure le programme avant de modifier ses jours.', 'VALIDATION')
    const updated = { ...day, ...valid }
    await db.programDays.put(updated)
    return updated
  },

  async moveDay(id: string, direction: -1 | 1): Promise<void> {
    await db.transaction('rw', db.programDays, db.programs, async () => {
      const day = await db.programDays.get(id)
      if (!day) throw new ProgramServiceError('Ce jour est introuvable. Actualise le programme.', 'NOT_FOUND')
      const program = await db.programs.get(day.programId)
      if (program?.status === 'archive') throw new ProgramServiceError('Restaure le programme avant de réorganiser ses jours.', 'VALIDATION')
      const days = (await db.programDays.where('programId').equals(day.programId).toArray()).sort((a, b) => a.dayOrder - b.dayOrder)
      const index = days.findIndex(item => item.id === id)
      const target = index + direction
      if (target < 0 || target >= days.length) return
      ;[days[index], days[target]] = [days[target], days[index]]
      await Promise.all(days.map((item, order) => db.programDays.update(item.id, { dayOrder: order + 1 })))
    })
  },

  async deleteDay(id: string): Promise<void> {
    await db.transaction('rw', db.programDays, db.programExercises, db.workoutSessions, async () => {
      const day = await db.programDays.get(id)
      if (!day) throw new ProgramServiceError('Ce jour est introuvable.', 'NOT_FOUND')
      const program = await db.programs.get(day.programId)
      if (program?.status === 'archive') throw new ProgramServiceError('Restaure le programme avant de modifier ses jours.', 'VALIDATION')
      const sessions = await db.workoutSessions.where('programDayId').equals(id).toArray()
      if (sessions.length) throw new ProgramServiceError("Ce jour est référencé par l'historique. Il est conservé pour protéger tes séances.", 'HISTORY_PROTECTED')
      await db.programExercises.where('programDayId').equals(id).delete()
      await db.programDays.delete(id)
      const remaining = (await db.programDays.where('programId').equals(day.programId).toArray()).sort((a, b) => a.dayOrder - b.dayOrder)
      await Promise.all(remaining.map((item, order) => db.programDays.update(item.id, { dayOrder: order + 1 })))
    })
  },
}
