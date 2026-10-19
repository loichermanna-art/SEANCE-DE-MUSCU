import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Exercise } from '../domain/types'
import { db } from './db'
import { historyService } from './historyService'
import { programExerciseService } from './programExerciseService'
import { programService } from './programService'
import { workoutService } from './workoutService'

const exercise: Exercise = {
  id: 'history-squat', name: 'Squat historique', equipment: 'barre', movementType: 'jambes', difficulty: 2,
  description: '', instructions: '', isCustom: false, createdAt: '2026-01-01T00:00:00.000Z',
}
let dayId = ''

beforeEach(async () => {
  await db.transaction('rw', [db.programs, db.programDays, db.programExercises, db.workoutSessions, db.workoutExercises, db.workoutSets, db.exercises], async () => {
    await db.workoutSets.clear(); await db.workoutExercises.clear(); await db.workoutSessions.clear()
    await db.programExercises.clear(); await db.programDays.clear(); await db.programs.clear(); await db.exercises.put(exercise)
  })
  const program = await programService.createProgram({ name: 'Force', objective: '', status: 'actif' })
  const day = await programService.createDay(program.id, { name: 'Bas du corps', notes: '' })
  dayId = day.id
  await programExerciseService.add(dayId, { exerciseId: exercise.id, targetSets: 3, minReps: 8, maxReps: 12, targetLoad: 60, restSeconds: 90 })
})

async function completeAllSets() {
  const detail = await workoutService.startFromDay(dayId)
  for (const set of detail.exercises[0].sets) {
    await workoutService.updateSetDraft(set.id, { loadValue: 60, loadUnit: 'kg', repetitions: 12 })
    await workoutService.completeSet(set.id)
  }
  await workoutService.finish(detail.session.id)
  return detail.session.id
}

describe('real workout history', () => {
  it('builds history, volume, records, and a transparent progression suggestion from completed sets only', async () => {
    const sessionId = await completeAllSets()
    const history = await historyService.listCompletedSessions()
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ session: { id: sessionId, status: 'terminee' }, totalWorkSets: 3, volume: 2160 })
    expect(history[0].exercises[0]).toMatchObject({ name: 'Squat historique', bestLoad: 60, bestReps: 12, volume: 2160 })

    const progress = await historyService.getExerciseProgress(exercise.id)
    expect(progress?.records).toMatchObject({ bestLoad: 60, bestReps: 12, totalWorkSets: 3 })
    expect(progress?.suggestion).toMatchObject({ type: 'augmenter_charge', suggestedLoad: 62.5 })
    expect(progress?.points).toHaveLength(1)
  })

  it('does not invent history for pending or canceled sessions', async () => {
    const session = await workoutService.startFromDay(dayId)
    await workoutService.cancel(session.session.id)
    expect(await historyService.listCompletedSessions()).toHaveLength(0)
    expect(await historyService.getExerciseProgress(exercise.id)).toMatchObject({ points: [], records: { bestLoad: null, totalWorkSets: 0 } })
  })
})
