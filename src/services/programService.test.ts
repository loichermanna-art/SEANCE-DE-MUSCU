import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ProgramExercise, WorkoutSession } from '../domain/types'
import { LOCAL_USER_ID } from '../domain/types'
import { db } from './db'
import { ProgramServiceError, programService, validateDay, validateProgram } from './programService'

const input = (name: string) => ({ name, objective: '', status: 'actif' as const })
const dayInput = (name: string) => ({ name, notes: '' })

beforeEach(async () => {
  await db.transaction('rw', db.programs, db.programDays, db.programExercises, db.workoutSessions, async () => {
    await db.programExercises.clear()
    await db.workoutSessions.clear()
    await db.programDays.clear()
    await db.programs.clear()
  })
})

describe('program validation', () => {
  it('trims required names and optional objective', () => {
    expect(validateProgram({ name: '  Force  ', objective: '  Progression  ', status: 'actif' })).toEqual({
      name: 'Force', objective: 'Progression', status: 'actif',
    })
  })

  it('rejects a blank program name and overlong fields', () => {
    expect(() => validateProgram({ name: '   ', objective: '', status: 'actif' })).toThrow(ProgramServiceError)
    expect(() => validateProgram({ name: 'x'.repeat(81), objective: '', status: 'actif' })).toThrow(/80 caractères/)
    expect(() => validateProgram({ name: 'Force', objective: 'x'.repeat(241), status: 'actif' })).toThrow(/240 caractères/)
  })

  it('accepts optional weekday and trims day fields', () => {
    expect(validateDay({ name: '  Jambes ', scheduledWeekday: 2, notes: '  Technique  ' })).toEqual({
      name: 'Jambes', scheduledWeekday: 2, notes: 'Technique',
    })
    expect(validateDay({ name: 'Dos' })).toEqual({ name: 'Dos', scheduledWeekday: undefined, notes: '' })
  })

  it('rejects blank/overlong day fields and invalid weekdays', () => {
    expect(() => validateDay({ name: ' ' })).toThrow(/obligatoire/)
    expect(() => validateDay({ name: 'x'.repeat(61) })).toThrow(/60 caractères/)
    expect(() => validateDay({ name: 'Dos', scheduledWeekday: 8 })).toThrow(/jour de semaine/)
    expect(() => validateDay({ name: 'Dos', notes: 'x'.repeat(501) })).toThrow(/500 caractères/)
  })
})

describe('program and day persistence', () => {
  it('creates, updates and lists programs with their current day counts', async () => {
    const program = await programService.createProgram(input('Force'))
    const day = await programService.createDay(program.id, dayInput('Jambes'))
    const updated = await programService.updateProgram(program.id, {
      name: 'Force et volume', objective: 'Progression régulière', status: 'pause',
    })

    expect(updated.name).toBe('Force et volume')
    expect(updated.status).toBe('pause')
    expect(await programService.listPrograms()).toEqual([
      expect.objectContaining({ id: program.id, name: 'Force et volume', daysCount: 1 }),
    ])
    expect(await programService.listDays(program.id)).toEqual([expect.objectContaining({ id: day.id, dayOrder: 1 })])
  })

  it('normalizes day order when adding, moving, and deleting days', async () => {
    const program = await programService.createProgram(input('Force'))
    const legs = await programService.createDay(program.id, dayInput('Jambes'))
    const back = await programService.createDay(program.id, dayInput('Dos'))
    const chest = await programService.createDay(program.id, dayInput('Pectoraux'))

    // Recover safely from a pre-existing gap instead of carrying it forward.
    await db.programDays.update(back.id, { dayOrder: 9 })
    const shoulders = await programService.createDay(program.id, dayInput('Épaules'))
    expect((await programService.listDays(program.id)).map(day => day.dayOrder)).toEqual([1, 2, 3, 4])

    await programService.moveDay(back.id, -1)
    expect((await programService.listDays(program.id)).map(day => day.id)).toEqual([
      legs.id, back.id, chest.id, shoulders.id,
    ])
    expect((await programService.listDays(program.id)).map(day => day.dayOrder)).toEqual([1, 2, 3, 4])

    await programService.deleteDay(legs.id)
    expect((await programService.listDays(program.id)).map(day => day.dayOrder)).toEqual([1, 2, 3])
  })

  it('enforces archived read-only behavior and restores only to pause', async () => {
    const program = await programService.createProgram(input('Force'))
    await programService.setStatus(program.id, 'archive')

    await expect(programService.updateProgram(program.id, input('Renamed'))).rejects.toMatchObject({ code: 'VALIDATION' })
    await expect(programService.createDay(program.id, dayInput('Jambes'))).rejects.toMatchObject({ code: 'VALIDATION' })
    await expect(programService.deleteProgram(program.id)).rejects.toMatchObject({ code: 'VALIDATION' })
    await expect(programService.setStatus(program.id, 'actif')).rejects.toMatchObject({ code: 'VALIDATION' })

    await programService.setStatus(program.id, 'pause')
    expect((await programService.getProgram(program.id))?.status).toBe('pause')
    await expect(programService.updateProgram(program.id, input('Renamed'))).resolves.toMatchObject({ name: 'Renamed' })
  })

  it('protects referenced history and rolls back program/day deletion atomically', async () => {
    const program = await programService.createProgram(input('Force'))
    const day = await programService.createDay(program.id, dayInput('Jambes'))
    const exercise: ProgramExercise = {
      id: crypto.randomUUID(), programDayId: day.id, exerciseId: 'squat', exerciseOrder: 1,
      targetSets: 3, minReps: 8, maxReps: 10, restSeconds: 90,
    }
    const session: WorkoutSession = {
      id: crypto.randomUUID(), userId: LOCAL_USER_ID, programId: program.id, programDayId: day.id,
      name: 'Jambes', status: 'terminee', startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    await db.programExercises.add(exercise)
    await db.workoutSessions.add(session)

    await expect(programService.deleteDay(day.id)).rejects.toMatchObject({ code: 'HISTORY_PROTECTED' })
    await expect(programService.deleteProgram(program.id)).rejects.toMatchObject({ code: 'HISTORY_PROTECTED' })
    expect(await db.programs.get(program.id)).toBeDefined()
    expect(await db.programDays.get(day.id)).toBeDefined()
    expect(await db.programExercises.get(exercise.id)).toBeDefined()
    expect(await db.workoutSessions.get(session.id)).toBeDefined()

    await db.workoutSessions.delete(session.id)
    await programService.deleteProgram(program.id)
    expect(await db.programs.get(program.id)).toBeUndefined()
    expect(await db.programDays.get(day.id)).toBeUndefined()
    expect(await db.programExercises.get(exercise.id)).toBeUndefined()
  })
})
