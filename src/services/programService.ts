// GYM OS — Service Programmes (§6.1) — accès données séparé des composants (§16.2).
// Règles d’intégrité (docs/03 §3) :
//  • Supprimer un programme/jour n’efface JAMAIS une séance réalisée (§17.2).
//  • Les cibles sont copiées par snapshot au démarrage d’une séance (§6.3).

import { db, newId, nowIso } from './db'
import { LOCAL_USER_ID, type Exercise, type Program, type ProgramDay, type ProgramExercise, type ProgramStatus } from '../domain/types'
import { validateProgramDayInput, validateProgramExerciseInput, validateProgramInput } from '../domain/programs'

export interface ProgramSummary extends Program {
  days: number
  exercises: number
}

export interface ProgramDayDetail extends ProgramDay {
  exercises: Array<ProgramExercise & { exercise?: Exercise }>
}

export async function listPrograms(): Promise<ProgramSummary[]> {
  const programs = await db.programs.where('userId').equals(LOCAL_USER_ID).toArray()
  const days = await db.programDays.toArray()
  const exercises = await db.programExercises.toArray()
  const daysByProgram = new Map<string, number>()
  for (const d of days) daysByProgram.set(d.programId, (daysByProgram.get(d.programId) ?? 0) + 1)
  const dayIds = new Set(days.map((d) => d.id))
  const exByProgram = new Map<string, number>()
  for (const pe of exercises) {
    if (!dayIds.has(pe.programDayId)) continue
    const programId = (await db.programDays.get(pe.programDayId))?.programId
    if (!programId) continue
    exByProgram.set(programId, (exByProgram.get(programId) ?? 0) + 1)
  }
  return programs
    .map((p) => ({ ...p, days: daysByProgram.get(p.id) ?? 0, exercises: exByProgram.get(p.id) ?? 0 }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getProgramDetail(programId: string): Promise<{ program: Program; days: ProgramDayDetail[] } | null> {
  const program = await db.programs.get(programId)
  if (!program || program.userId !== LOCAL_USER_ID) return null
  const days = await db.programDays.where('programId').equals(programId).sortBy('dayOrder')
  const details: ProgramDayDetail[] = []
  for (const day of days) {
    const pes = await db.programExercises.where('programDayId').equals(day.id).sortBy('exerciseOrder')
    const exercises: ProgramDayDetail['exercises'] = []
    for (const pe of pes) {
      const exercise = pe.exerciseId ? await db.exercises.get(pe.exerciseId) : undefined
      exercises.push({ ...pe, exercise })
    }
    details.push({ ...day, exercises })
  }
  return { program, days: details }
}

export async function createProgram(input: { name: string; objective: string }): Promise<Program> {
  const v = validateProgramInput(input)
  if (!v.ok) throw new Error(v.errors[0])
  const program: Program = {
    id: newId(), userId: LOCAL_USER_ID,
    name: input.name.trim(), objective: input.objective.trim(),
    status: 'actif', createdAt: nowIso(), updatedAt: nowIso(),
  }
  await db.programs.put(program)
  return program
}

export async function updateProgram(id: string, patch: Partial<Pick<Program, 'name' | 'objective'>>): Promise<void> {
  const existing = await db.programs.get(id)
  if (!existing) throw new Error('Programme introuvable.')
  const v = validateProgramInput({ name: patch.name ?? existing.name, objective: patch.objective ?? existing.objective })
  if (!v.ok) throw new Error(v.errors[0])
  await db.programs.update(id, { ...patch, name: (patch.name ?? existing.name).trim(), updatedAt: nowIso() })
}

export async function setProgramStatus(id: string, status: ProgramStatus): Promise<void> {
  await db.programs.update(id, { status, updatedAt: nowIso() })
}

/** Suppression prudente : cascades jours + exercices planifiés, jamais les séances (§17.2). */
export async function deleteProgram(id: string): Promise<void> {
  const program = await db.programs.get(id)
  if (!program) return
  const days = await db.programDays.where('programId').equals(id).toArray()
  await db.transaction('rw', [db.programs, db.programDays, db.programExercises], async () => {
    for (const day of days) {
      await db.programExercises.where('programDayId').equals(day.id).delete()
    }
    await db.programDays.where('programId').equals(id).delete()
    await db.programs.delete(id)
  })
}

export async function createDay(programId: string, input: { name: string; scheduledWeekday?: number; notes?: string }): Promise<ProgramDay> {
  const existing = await db.programs.get(programId)
  if (!existing) throw new Error('Programme introuvable.')
  const dayCount = await db.programDays.where('programId').equals(programId).count()
  const day: ProgramDay = {
    id: newId(), programId, name: input.name.trim(),
    dayOrder: dayCount, scheduledWeekday: input.scheduledWeekday, notes: input.notes?.trim() || undefined,
  }
  const v = validateProgramDayInput(day)
  if (!v.ok) throw new Error(v.errors[0])
  await db.programDays.put(day)
  await db.programs.update(programId, { updatedAt: nowIso() })
  return day
}

export async function updateDay(id: string, patch: Partial<Pick<ProgramDay, 'name' | 'scheduledWeekday' | 'notes'>>): Promise<void> {
  const existing = await db.programDays.get(id)
  if (!existing) throw new Error('Jour introuvable.')
  const next = { ...existing, ...patch, name: (patch.name ?? existing.name).trim() }
  const v = validateProgramDayInput(next)
  if (!v.ok) throw new Error(v.errors[0])
  await db.programDays.update(id, { ...next, notes: next.notes?.trim() || undefined })
  await db.programs.update(existing.programId, { updatedAt: nowIso() })
}

/** Intervertit l’ordre de deux jours voisins. */
export async function moveDay(id: string, direction: -1 | 1): Promise<void> {
  const day = await db.programDays.get(id)
  if (!day) return
  const siblings = await db.programDays.where('programId').equals(day.programId).sortBy('dayOrder')
  const index = siblings.findIndex((d) => d.id === id)
  const swapWith = siblings[index + direction]
  if (!swapWith) return
  await db.transaction('rw', db.programDays, async () => {
    await db.programDays.update(day.id, { dayOrder: swapWith.dayOrder })
    await db.programDays.update(swapWith.id, { dayOrder: day.dayOrder })
  })
}

export async function deleteDay(id: string): Promise<void> {
  const day = await db.programDays.get(id)
  if (!day) return
  await db.transaction('rw', [db.programDays, db.programExercises], async () => {
    await db.programExercises.where('programDayId').equals(id).delete()
    await db.programDays.delete(id)
  })
  // Les séances déjà réalisées sur ce jour ne sont JAMAIS touchées (§17.2).
}

export async function addExerciseToDay(dayId: string, exerciseId: string, input: Omit<ProgramExercise, 'id' | 'programDayId' | 'exerciseId' | 'exerciseOrder'>): Promise<ProgramExercise> {
  const day = await db.programDays.get(dayId)
  if (!day) throw new Error('Jour introuvable.')
  const exercise = await db.exercises.get(exerciseId)
  if (!exercise) throw new Error('Exercice introuvable.')
  const count = await db.programExercises.where('programDayId').equals(dayId).count()
  const pe: ProgramExercise = {
    id: newId(), programDayId: dayId, exerciseId,
    exerciseOrder: count, targetSets: input.targetSets, minReps: input.minReps,
    maxReps: input.maxReps, targetLoad: input.targetLoad, restSeconds: input.restSeconds,
    notes: input.notes?.trim() || undefined,
  }
  const v = validateProgramExerciseInput(pe)
  if (!v.ok) throw new Error(v.errors[0])
  await db.programExercises.put(pe)
  await db.programs.update(day.programId, { updatedAt: nowIso() })
  return pe
}

export async function updateProgramExercise(id: string, patch: Partial<Omit<ProgramExercise, 'id' | 'programDayId' | 'exerciseId' | 'exerciseOrder'>>): Promise<void> {
  const existing = await db.programExercises.get(id)
  if (!existing) throw new Error('Exercice planifié introuvable.')
  const next = { ...existing, ...patch }
  const v = validateProgramExerciseInput(next)
  if (!v.ok) throw new Error(v.errors[0])
  await db.programExercises.update(id, next)
}

export async function deleteProgramExercise(id: string): Promise<void> {
  await db.programExercises.delete(id)
}

/** Intervertit l’ordre de deux exercices voisins du même jour. */
export async function moveProgramExercise(id: string, direction: -1 | 1): Promise<void> {
  const pe = await db.programExercises.get(id)
  if (!pe) return
  const siblings = await db.programExercises.where('programDayId').equals(pe.programDayId).sortBy('exerciseOrder')
  const index = siblings.findIndex((e) => e.id === id)
  const swapWith = siblings[index + direction]
  if (!swapWith) return
  await db.transaction('rw', db.programExercises, async () => {
    await db.programExercises.update(pe.id, { exerciseOrder: swapWith.exerciseOrder })
    await db.programExercises.update(swapWith.id, { exerciseOrder: pe.exerciseOrder })
  })
}

/** Exercices correspondant à une recherche (bibliothèque + perso). */
export async function searchExercises(query: string, muscleGroupId?: string, equipment?: string): Promise<Array<Exercise & { muscleNames: string[] }>> {
  const [exercises, links, groups] = await Promise.all([
    db.exercises.orderBy('name').toArray(),
    db.exerciseMuscles.toArray(),
    db.muscleGroups.toArray(),
  ])
  const q = query.trim().toLowerCase()
  const musclesOf = new Map<string, string[]>()
  for (const link of links) {
    const group = groups.find((g) => g.id === link.muscleGroupId)
    if (!group) continue
    const list = musclesOf.get(link.exerciseId) ?? []
    list.push(group.name)
    musclesOf.set(link.exerciseId, list)
  }
  return exercises
    .filter((e) => {
      if (q && !e.name.toLowerCase().includes(q) && !(e.alternativeNames ?? '').toLowerCase().includes(q)) return false
      if (muscleGroupId) {
        const link = links.find((l) => l.exerciseId === e.id && l.muscleGroupId === muscleGroupId)
        if (!link) return false
      }
      if (equipment && e.equipment !== equipment) return false
      return true
    })
    .map((e) => ({ ...e, muscleNames: musclesOf.get(e.id) ?? [] }))
}
