// GYM OS — Calculs sportifs déterministes (§8, docs/04-regles-metier.md)
// Fonctions PURES : aucun accès base de données, aucune dépendance React.
// Elles sont la seule source de vérité des chiffres affichés (§13.4).

import type { WorkoutSet } from './types'

/** Une série compte dans les statistiques si elle est validée (§19.2). */
function validSets(sets: WorkoutSet[]): WorkoutSet[] {
  return sets.filter((s) => s.status === 'validee')
}

/**
 * Volume de travail = Σ charge × répétitions, séries de TRAVAIL validées (§8.2).
 * Retourne `null` si aucun volume mesurable (poids du corps) : on n'affiche
 * alors jamais un volume « exact » inventé.
 */
export function computeVolume(sets: WorkoutSet[]): number | null {
  const work = validSets(sets).filter((s) => s.setType === 'travail')
  if (work.length === 0) return null
  if (work.every((s) => s.loadValue <= 0)) return null
  return work.reduce((sum, s) => sum + s.loadValue * s.repetitions, 0)
}

export function computeTotalReps(sets: WorkoutSet[]): number {
  return validSets(sets)
    .filter((s) => s.setType === 'travail')
    .reduce((sum, s) => sum + s.repetitions, 0)
}

export interface ExerciseRecords {
  /** Meilleure charge sur une série validée, null si jamais de charge externe */
  bestLoad: number | null
  /** Meilleur nombre de répétitions, toutes charges confondues */
  bestReps: number | null
  /** Meilleur volume sur UNE séance (comparable à exercice égal uniquement) */
  bestSessionVolume: number | null
  totalWorkSets: number
}

/** Records selon les critères explicites du §8.4. */
export function computeExerciseRecords(setsBySession: WorkoutSet[][]): ExerciseRecords {
  let bestLoad: number | null = null
  let bestReps: number | null = null
  let bestSessionVolume: number | null = null
  let totalWorkSets = 0

  for (const sessionSets of setsBySession) {
    const work = validSets(sessionSets).filter((s) => s.setType === 'travail')
    totalWorkSets += work.length
    for (const s of work) {
      if (s.loadValue > 0 && (bestLoad === null || s.loadValue > bestLoad)) bestLoad = s.loadValue
      if (bestReps === null || s.repetitions > bestReps) bestReps = s.repetitions
    }
    const v = computeVolume(sessionSets)
    if (v !== null && (bestSessionVolume === null || v > bestSessionVolume)) bestSessionVolume = v
  }
  return { bestLoad, bestReps, bestSessionVolume, totalWorkSets }
}
