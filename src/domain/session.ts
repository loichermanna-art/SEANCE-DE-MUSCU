// GYM OS — Règles métier de la séance en direct (§7, docs/04-regles-metier.md)
// Fonctions PURES : aucune dépendance React ni base de données.

import { computeVolume } from './calculations'
import type { ProgramExercise, WorkoutExercise, WorkoutSet } from './types'

/**
 * Construit les brouillons d'exercices d'une séance à partir d'un jour
 * de programme — avec SNAPSHOT des noms et des cibles (§6.3) : modifier
 * le programme après coup ne change jamais la séance en cours.
 */
export function buildSessionExercises(
  programExercises: Array<Pick<ProgramExercise, 'exerciseId' | 'exerciseOrder' | 'targetSets' | 'minReps' | 'maxReps' | 'targetLoad' | 'restSeconds'> & { exerciseName: string }>,
  sessionId: string,
): Array<Omit<WorkoutExercise, 'id'>> {
  return programExercises
    .slice()
    .sort((a, b) => a.exerciseOrder - b.exerciseOrder)
    .map((pe, index) => ({
      workoutSessionId: sessionId,
      exerciseId: pe.exerciseId,
      exerciseNameSnapshot: pe.exerciseName,
      exerciseOrder: index,
      status: 'en_cours' as const,
      targetSets: pe.targetSets,
      minReps: pe.minReps,
      maxReps: pe.maxReps,
      targetLoad: pe.targetLoad,
      restSeconds: pe.restSeconds,
    }))
}

export interface SetPrefillSource {
  targetLoad?: number
  minReps: number
  maxReps: number
  /** Dernière série validée dans CETTE séance (priorité 1) */
  lastSetInSession?: Pick<WorkoutSet, 'loadValue' | 'repetitions'> | null
  /** Dernière série validée en séance précédente (§7.3) */
  lastSetInHistory?: Pick<WorkoutSet, 'loadValue' | 'repetitions'> | null
}

/**
 * Pré-remplissage d'une série (§7.3) :
 * 1. la dernière série validée de la séance en cours,
 * 2. sinon la dernière performance historique du même exercice,
 * 3. sinon les cibles du programme (charge cible, reps = max de plage).
 */
export function computeSetPrefill(src: SetPrefillSource): { loadValue: number; repetitions: number } {
  const last = src.lastSetInSession ?? src.lastSetInHistory ?? null
  if (last) return { loadValue: last.loadValue, repetitions: last.repetitions }
  return { loadValue: src.targetLoad ?? 0, repetitions: src.maxReps }
}

export interface SessionExerciseSummary {
  name: string
  workSets: number
  reps: number
  /** null = poids du corps uniquement : aucun volume « exact » inventé (§8.2) */
  volume: number | null
  bestLoad: number | null
}

export interface SessionSummary {
  durationSeconds: number
  totalSets: number
  totalReps: number
  /** null si aucune charge externe mesurable */
  volume: number | null
  exercises: SessionExerciseSummary[]
}

/** Bilan de fin de séance (§7.6) — uniquement séries validées (§19.2). */
export function summarizeSession(
  exercises: Array<{ name: string; sets: WorkoutSet[] }>,
  startedAt?: string,
  endedAt?: string,
): SessionSummary {
  let totalSets = 0
  let totalReps = 0
  let volume: number | null = null
  const perExercise: SessionExerciseSummary[] = []

  for (const ex of exercises) {
    const work = ex.sets.filter((s) => s.status === 'validee' && s.setType === 'travail')
    totalSets += work.length
    totalReps += work.reduce((sum, s) => sum + s.repetitions, 0)
    const exVolume = computeVolume(ex.sets)
    let bestLoad: number | null = null
    for (const s of work) {
      if (s.loadValue > 0 && (bestLoad === null || s.loadValue > bestLoad)) bestLoad = s.loadValue
    }
    if (exVolume !== null) volume = (volume ?? 0) + exVolume
    perExercise.push({ name: ex.name, workSets: work.length, reps: work.reduce((sum, s) => sum + s.repetitions, 0), volume: exVolume, bestLoad })
  }

  const durationSeconds = startedAt && endedAt
    ? Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000))
    : 0

  return { durationSeconds, totalSets, totalReps, volume, exercises: perExercise }
}

/** « 1 h 23 min », « 45 min », « 38 s ». */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`
  if (minutes > 0) return secs > 0 ? `${minutes} min ${secs} s` : `${minutes} min`
  return `${secs} s`
}

/** Secondes restantes d'un minuteur à horodatage absolu (§7.4) :
 *  le calcul dépend de l'horloge, jamais du décompte — l'onglet en
 *  arrière-plan ne peut pas faire dériver le minuteur. */
export function restRemainingSeconds(endsAtIso: string, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(endsAtIso).getTime() - now) / 1000))
}
