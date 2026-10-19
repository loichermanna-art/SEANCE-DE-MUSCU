import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Exercise } from '../domain/types'
import { db } from './db'
import { programExerciseService, validateProgramExercise } from './programExerciseService'
import { programService } from './programService'

const exercises: Exercise[] = [
  { id: 'test-squat', name: 'Squat test', equipment: 'barre', movementType: 'jambes', difficulty: 2, description: '', instructions: '', isCustom: false, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'test-row', name: 'Row test', equipment: 'halteres', movementType: 'tirage', difficulty: 2, description: '', instructions: '', isCustom: false, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'test-press', name: 'Press test', equipment: 'barre', movementType: 'poussee', difficulty: 2, description: '', instructions: '', isCustom: false, createdAt: '2026-01-01T00:00:00.000Z' },
]
const prescription = (exerciseId: string) => ({ exerciseId, targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90, notes: '' })

let programId = ''
let dayId = ''

beforeEach(async () => {
  await db.transaction('rw', db.programExercises, db.programDays, db.programs, db.exercises, async () => {
    await db.programExercises.clear()
    await db.programDays.clear()
    await db.programs.clear()
    for (const exercise of exercises) await db.exercises.put(exercise)
  })
  const program = await programService.createProgram({ name: 'Programme de test', objective: '', status: 'actif' })
  const day = await programService.createDay(program.id, { name: 'Jambes', notes: '' })
  programId = program.id
  dayId = day.id
})

describe('program exercise validation', () => {
  it('normalizes valid prescriptions and enforces all numeric and text bounds', () => {
    expect(validateProgramExercise({ ...prescription('test-squat'), targetLoad: 80, notes: '  Tempo contrôlé  ' })).toEqual({
      exerciseId: 'test-squat', targetSets: 3, minReps: 8, maxReps: 12, targetLoad: 80, targetLoadUnit: 'kg', restSeconds: 90, notes: 'Tempo contrôlé',
    })
    expect(() => validateProgramExercise({ ...prescription('test-squat'), targetSets: 0 })).toThrow(/séries/)
    expect(() => validateProgramExercise({ ...prescription('test-squat'), minReps: 13, maxReps: 12 })).toThrow(/minimum de répétitions/)
    expect(() => validateProgramExercise({ ...prescription('test-squat'), targetLoad: Number.NaN })).toThrow(/charge cible/)
    expect(() => validateProgramExercise({ ...prescription('test-squat'), restSeconds: 3601 })).toThrow(/repos/)
    expect(() => validateProgramExercise({ ...prescription('test-squat'), notes: 'x'.repeat(501) })).toThrow(/500 caractères/)
  })
})

describe('program exercise persistence', () => {
  it('adds, edits, reorders, joins, and removes prescriptions with contiguous order', async () => {
    const squat = await programExerciseService.add(dayId, prescription('test-squat'))
    const row = await programExerciseService.add(dayId, { ...prescription('test-row'), targetLoad: 24 })
    expect((await programExerciseService.listForDay(dayId)).map(item => item.exercise.name)).toEqual(['Squat test', 'Row test'])

    const edited = await programExerciseService.update(squat.id, { ...prescription('test-squat'), targetSets: 4 })
    expect(edited.targetSets).toBe(4)
    await programExerciseService.move(row.id, -1)
    expect((await db.programExercises.where('programDayId').equals(dayId).sortBy('exerciseOrder')).map(item => item.id)).toEqual([row.id, squat.id])

    await programExerciseService.remove(row.id)
    expect(await db.programExercises.where('programDayId').equals(dayId).toArray()).toEqual([
      expect.objectContaining({ id: squat.id, exerciseOrder: 1 }),
    ])
  })

  it('rejects duplicates and missing library exercises', async () => {
    await programExerciseService.add(dayId, prescription('test-squat'))
    await expect(programExerciseService.add(dayId, prescription('test-squat'))).rejects.toThrow(/déjà ajouté/)
    await expect(programExerciseService.add(dayId, prescription('deleted-exercise'))).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('blocks edits to archived programs and reports missing day/program records', async () => {
    await programService.setStatus(programId, 'archive')
    await expect(programExerciseService.add(dayId, prescription('test-squat'))).rejects.toMatchObject({ code: 'VALIDATION' })
    await programService.setStatus(programId, 'pause')
    await db.programDays.delete(dayId)
    await expect(programExerciseService.add(dayId, prescription('test-squat'))).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
