import type { WorkoutSession, WorkoutSet } from '../domain/types'
import { LOCAL_USER_ID } from '../domain/types'
import { computeExerciseRecords, computeVolume, loadInKilograms } from '../domain/calculations'
import { detectStagnation, suggestDoubleProgression, type ProgressionSuggestion } from '../domain/progression'
import { db } from './db'

export interface HistoryExercise {
  id: string
  exerciseId?: string
  name: string
  order: number
  status: string
  sets: WorkoutSet[]
  volume: number | null
  bestLoad: number | null
  bestReps: number | null
}
export interface HistorySession {
  session: WorkoutSession
  exercises: HistoryExercise[]
  volume: number | null
  totalWorkSets: number
  durationSeconds: number | null
}
export interface ExerciseProgressPoint {
  sessionId: string
  date: string
  name: string
  volume: number | null
  bestLoad: number | null
  bestReps: number | null
  workSets: number
}
export interface ExerciseProgress {
  exerciseId: string
  exerciseName: string
  points: ExerciseProgressPoint[]
  records: ReturnType<typeof computeExerciseRecords>
  suggestion?: ProgressionSuggestion
  stagnating: boolean
}

function sortSets(sets: WorkoutSet[]) {
  return sets.sort((a, b) => a.setNumber - b.setNumber || a.id.localeCompare(b.id))
}

function completedWork(sets: WorkoutSet[]) {
  return sets.filter(set => set.status === 'validee' && set.setType === 'travail')
}

function maxOrNull(values: number[]): number | null {
  return values.length ? Math.max(...values) : null
}

export const historyService = {
  async listCompletedSessions(): Promise<HistorySession[]> {
    const sessions = (await db.workoutSessions.where('userId').equals(LOCAL_USER_ID).toArray())
      .filter(session => session.status === 'terminee')
      .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))
    return Promise.all(sessions.map(async session => {
      const workoutExercises = (await db.workoutExercises.where('workoutSessionId').equals(session.id).toArray())
        .sort((a, b) => a.exerciseOrder - b.exerciseOrder || a.id.localeCompare(b.id))
      const exercises = await Promise.all(workoutExercises.map(async row => {
        const sets = sortSets(await db.workoutSets.where('workoutExerciseId').equals(row.id).toArray())
        const valid = completedWork(sets)
        const bestLoad = maxOrNull(valid.map(loadInKilograms).filter(value => value > 0))
        const bestReps = maxOrNull(valid.map(set => set.repetitions))
        return {
          id: row.id, exerciseId: row.exerciseId, name: row.exerciseNameSnapshot, order: row.exerciseOrder,
          status: row.status, sets, volume: computeVolume(sets), bestLoad, bestReps,
        }
      }))
      const volumes = exercises.map(exercise => exercise.volume).filter((volume): volume is number => volume !== null)
      const duration = session.startedAt && session.endedAt
        ? Math.max(0, Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000))
        : null
      return {
        session, exercises,
        volume: volumes.length ? volumes.reduce((sum, value) => sum + value, 0) : null,
        totalWorkSets: exercises.reduce((sum, exercise) => sum + completedWork(exercise.sets).length, 0),
        durationSeconds: duration,
      }
    }))
  },

  async getExerciseProgress(exerciseId: string): Promise<ExerciseProgress | undefined> {
    const exercise = await db.exercises.get(exerciseId)
    if (!exercise) return undefined
    const rows = await db.workoutExercises.where('exerciseId').equals(exerciseId).toArray()
    const all = await Promise.all(rows.map(async row => {
      const session = await db.workoutSessions.get(row.workoutSessionId)
      if (!session || session.userId !== LOCAL_USER_ID || session.status !== 'terminee') return undefined
      const sets = sortSets(await db.workoutSets.where('workoutExerciseId').equals(row.id).toArray())
      const valid = completedWork(sets)
      const bestLoad = maxOrNull(valid.map(loadInKilograms).filter(value => value > 0))
      const bestReps = maxOrNull(valid.map(set => set.repetitions))
      return { row, session, sets, valid, point: {
        sessionId: session.id, date: session.endedAt ?? session.startedAt ?? session.createdAt,
        name: session.name, volume: computeVolume(sets), bestLoad, bestReps, workSets: valid.length,
      } as ExerciseProgressPoint }
    }))
    const completed = all.filter((item): item is NonNullable<typeof item> => item !== undefined)
      .sort((a, b) => (a.session.endedAt ?? '').localeCompare(b.session.endedAt ?? ''))
    const groups = completed.map(item => item.valid)
    const records = computeExerciseRecords(groups)
    const latest = completed.at(-1)
    let suggestion: ProgressionSuggestion | undefined
    if (latest && latest.row.targetSetsSnapshot !== undefined && latest.row.minRepsSnapshot !== undefined && latest.row.maxRepsSnapshot !== undefined) {
      suggestion = suggestDoubleProgression({
        minReps: latest.row.minRepsSnapshot,
        maxReps: latest.row.maxRepsSnapshot,
        targetSets: latest.row.targetSetsSnapshot,
        equipment: exercise.equipment,
        lastWorkSets: latest.valid,
      })
    }
    return {
      exerciseId, exerciseName: exercise.name, points: completed.map(item => item.point), records, suggestion,
      stagnating: detectStagnation(completed.map(item => item.valid).reverse()),
    }
  },
}
