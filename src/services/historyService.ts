// GYM OS — Service Historique & progression (§8).
// Alimenté UNIQUEMENT par les séances réellement terminées.

import { db } from './db'
import type { WorkoutSet } from '../domain/types'
import { summarizeSession, type SessionSummary } from '../domain/session'
import type { SessionWithSets } from '../domain/history'

export interface SessionSummaryRow {
  sessionId: string
  name: string
  status: string
  startedAt?: string
  endedAt?: string
  programName?: string
  dayName?: string
  summary: SessionSummary
}

/** Toutes les séances terminées, avec leur bilan calculé (§7.6). */
export async function listSessionSummaries(): Promise<SessionSummaryRow[]> {
  const sessions = (await db.workoutSessions
    .where('status')
    .equals('terminee')
    .toArray())
    .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))
  const exercises = await db.workoutExercises.toArray()
  const sets = await db.workoutSets.toArray()
  const programs = await db.programs.toArray()
  const days = await db.programDays.toArray()

  return sessions.map((session) => {
    const exRows = exercises
      .filter((e) => e.workoutSessionId === session.id)
      .sort((a, b) => a.exerciseOrder - b.exerciseOrder)
    const summary = summarizeSession(
      exRows.map((ex) => ({
        name: ex.exerciseNameSnapshot,
        sets: sets
          .filter((s) => s.workoutExerciseId === ex.id)
          .sort((a, b) => a.setNumber - b.setNumber),
      })),
      session.startedAt, session.endedAt,
    )
    const program = session.programId ? programs.find((p) => p.id === session.programId) : undefined
    const day = session.programDayId ? days.find((d) => d.id === session.programDayId) : undefined
    return {
      sessionId: session.id,
      name: session.name,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      programName: program?.name,
      dayName: day?.name,
      summary,
    }
  })
}

/** Historique d'un exercice : séances terminées, plus récentes d'abord. */
export async function getExerciseHistory(exerciseId: string): Promise<Array<{
  sessionId: string
  date: string
  sessionName: string
  sets: WorkoutSet[]
}>> {
  const rows = await db.workoutExercises.where('exerciseId').equals(exerciseId).toArray()
  if (rows.length === 0) return []
  const sessionIds = [...new Set(rows.map((r) => r.workoutSessionId))]
  const sessions = await db.workoutSessions.where('id').anyOf(sessionIds).toArray()
  const finished = sessions
    .filter((s) => s.status === 'terminee')
    .sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''))
  const result: Array<{ sessionId: string; date: string; sessionName: string; sets: WorkoutSet[] }> = []
  for (const session of finished) {
    const row = rows.find((r) => r.workoutSessionId === session.id)
    if (!row) continue
    const sets = (await db.workoutSets.where('workoutExerciseId').equals(row.id).toArray())
      .filter((s) => s.status === 'validee')
      .sort((a, b) => a.setNumber - b.setNumber)
    if (sets.length === 0) continue
    result.push({
      sessionId: session.id,
      date: session.endedAt ?? session.startedAt ?? '',
      sessionName: session.name,
      sets,
    })
  }
  return result
}

/** Séances terminées avec séries, pour les bilans hebdomadaires. */
export async function getSessionsForWeeklyBuckets(): Promise<SessionWithSets[]> {
  const sessions = await db.workoutSessions.where('status').equals('terminee').toArray()
  const exercises = await db.workoutExercises.toArray()
  const sets = await db.workoutSets.toArray()
  return sessions.map((s) => ({
    sessionId: s.id,
    startedAt: s.startedAt,
    endedAt: s.endedAt ?? s.createdAt,
    exercises: exercises
      .filter((e) => e.workoutSessionId === s.id)
      .map((ex) => ({
        name: ex.exerciseNameSnapshot,
        sets: sets.filter((set) => set.workoutExerciseId === ex.id),
      })),
  }))
}
