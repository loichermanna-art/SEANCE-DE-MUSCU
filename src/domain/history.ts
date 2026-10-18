// GYM OS — Règles métier de l'historique & progression (§8)
// Fonctions PURES : aucune dépendance React ni base de données.

import { computeVolume } from './calculations'
import type { WorkoutSet } from './types'

/** Une séance terminée avec ses séries, pour l'agrégation. */
export interface SessionWithSets {
  sessionId: string
  startedAt?: string
  endedAt: string
  exercises: Array<{ name: string; sets: WorkoutSet[] }>
}

export interface ExerciseHistoryPoint {
  sessionId: string
  date: string // ISO
  /** Meilleure série de travail de la séance (§8.4) */
  loadValue: number
  repetitions: number
  /** charge × reps du top set */
  volume: number
}

/**
 * Progression de charge : UN point par séance = le set de travail
 * le plus lourd (ex æquo → le plus de reps), chronologique.
 * Les séances sans série validée de travail sont ignorées.
 */
export function buildLoadProgression(
  points: Array<{ sessionId: string; date: string; sets: WorkoutSet[] }>,
): ExerciseHistoryPoint[] {
  return points
    .map((p) => {
      const work = p.sets.filter((s) => s.status === 'validee' && s.setType === 'travail')
      if (work.length === 0) return null
      const top = work.reduce((best, s) =>
        s.loadValue > best.loadValue || (s.loadValue === best.loadValue && s.repetitions > best.repetitions) ? s : best,
      )
      return {
        sessionId: p.sessionId,
        date: p.date,
        loadValue: top.loadValue,
        repetitions: top.repetitions,
        volume: top.loadValue * top.repetitions,
      }
    })
    .filter((p): p is ExerciseHistoryPoint => p !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export interface WeeklyBucket {
  /** Lundi de la semaine (ISO date) */
  weekStart: string
  label: string
  sessions: number
  minutes: number
  totalSets: number
  totalReps: number
  /** null = aucune charge mesurable cette semaine (§8.2) */
  volume: number | null
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7 // lundi = 0
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - day)
  return d
}

/**
 * Bilan hebdomadaire : agrège les séances TERMINÉES par semaine
 * (lundi → dimanche), sur les `weeks` dernières semaines incluse
 * celle-ci. Les semaines vides restent visibles (aucune donnée
 * inventée, principe n°4).
 */
export function buildWeeklyBuckets(
  sessions: SessionWithSets[],
  weeks = 8,
  now: number = Date.now(),
): WeeklyBucket[] {
  const firstMonday = startOfWeek(new Date(now))
  const buckets: WeeklyBucket[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(firstMonday)
    start.setDate(start.getDate() - i * 7)
    buckets.push({
      weekStart: start.toISOString(),
      label: start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      sessions: 0, minutes: 0, totalSets: 0, totalReps: 0, volume: null,
    })
  }

  for (const s of sessions) {
    if (!s.endedAt) continue
    const end = new Date(s.endedAt)
    const weekStart = startOfWeek(end)
    const bucket = buckets.find((b) => new Date(b.weekStart).getTime() === weekStart.getTime())
    if (!bucket) continue
    bucket.sessions += 1
    if (s.startedAt) {
      bucket.minutes += Math.max(0, Math.round((end.getTime() - new Date(s.startedAt).getTime()) / 60000))
    }
    let volume: number | null = null
    for (const ex of s.exercises) {
      const work = ex.sets.filter((set) => set.status === 'validee' && set.setType === 'travail')
      bucket.totalSets += work.length
      bucket.totalReps += work.reduce((sum, set) => sum + set.repetitions, 0)
      const v = computeVolume(ex.sets)
      if (v !== null) volume = (volume ?? 0) + v
    }
    if (volume !== null) bucket.volume = (bucket.volume ?? 0) + volume
  }
  return buckets
}

/** Tendance simple sur les N derniers points : 'progress', 'stable' ou 'baisse'. */
export function trendOf(points: ExerciseHistoryPoint[], window = 3): 'progress' | 'stable' | 'baisse' | 'insuffisant' {
  const recent = points.slice(-window)
  if (recent.length < 2) return 'insuffisant'
  const first = recent[0].loadValue
  const latest = recent[recent.length - 1].loadValue
  if (latest > first) return 'progress'
  if (latest < first) return 'baisse'
  return 'stable'
}
