// GYM OS — Progression double (§10.2) et stagnation (§10.4)
// Règles transparentes : toujours une PROPOSITION, jamais d'application automatique.

import type { WorkoutSet } from './types'
import { loadInKilograms } from './calculations'

export interface ProgressionSuggestion {
  type: 'augmenter_charge' | 'viser_plus_de_reps' | 'prudence' | 'donnees_insuffisantes'
  message: string
  suggestedLoad?: number
}

/** Incrément raisonnable selon le matériel (§10.2) */
export function loadIncrement(equipment: string): number {
  switch (equipment) {
    case 'halteres':
      return 2 // +1 kg par main, exprimé en charge totale par haltère : 2 kg d'incrément usuel
    case 'barre':
      return 2.5
    case 'machine':
    case 'poulie':
      return 5
    default:
      return 2.5
  }
}

export function suggestDoubleProgression(params: {
  minReps: number
  maxReps: number
  targetSets: number
  equipment: string
  lastWorkSets: WorkoutSet[] // séries de travail validées de la dernière séance comparable
}): ProgressionSuggestion {
  const { minReps, maxReps, targetSets, equipment, lastWorkSets } = params

  if (lastWorkSets.length === 0) {
    return {
      type: 'donnees_insuffisantes',
      message: `Aucune séance précédente pour cet exercice : vise ${targetSets} séries de ${minReps} à ${maxReps} répétitions avec une technique propre.`,
    }
  }

  const currentLoad = Math.max(...lastWorkSets.map(loadInKilograms))
  const allAtTop = lastWorkSets.length >= targetSets && lastWorkSets.every((s) => s.repetitions >= maxReps)

  if (allAtTop && currentLoad > 0) {
    const inc = loadIncrement(equipment)
    return {
      type: 'augmenter_charge',
      message: `Tu as atteint ${maxReps} répétitions sur toutes tes séries à ${currentLoad} kg. Tu peux essayer ${currentLoad + inc} kg et redescendre dans la plage ${minReps}–${maxReps} répétitions.`,
      suggestedLoad: currentLoad + inc,
    }
  }

  const bestReps = Math.max(...lastWorkSets.map((s) => s.repetitions))
  if (bestReps < minReps) {
    return {
      type: 'prudence',
      message: `Dernière séance : ${bestReps} répétitions au mieux, sous la cible de ${minReps}. Conserve ou réduis légèrement la charge et vérifie ta technique et ta récupération.`,
    }
  }

  return {
    type: 'viser_plus_de_reps',
    message:
      currentLoad > 0
        ? `Conserve ${currentLoad} kg et vise plus de répétitions (cible : ${maxReps} sur toutes les séries) avant d'augmenter la charge.`
        : `Vise plus de répétitions (cible : ${maxReps} sur toutes les séries) avant d'ajouter du lest.`,
  }
}

/**
 * Stagnation apparente (§10.4) : aucune progression de charge ni de répétitions
 * (à charge égale) sur au moins 3 expositions comparables.
 */
export function detectStagnation(sessionsNewestFirst: WorkoutSet[][]): boolean {
  const comparables = sessionsNewestFirst
    .map((sets) => sets.filter((s) => s.status === 'validee' && s.setType === 'travail' && s.loadValue > 0))
    .filter((sets) => sets.length > 0)
    .slice(0, 3)
  if (comparables.length < 3) return false

  const best = (sets: WorkoutSet[]) => {
    const load = Math.max(...sets.map(loadInKilograms))
    return { load, repsAtBestLoad: Math.max(...sets.filter(set => loadInKilograms(set) === load).map(set => set.repetitions)) }
  }
  const [latest, previous, oldest] = comparables.map(best)
  const progressed =
    latest.load > previous.load ||
    latest.load > oldest.load ||
    (latest.load === previous.load && latest.repsAtBestLoad > previous.repsAtBestLoad) ||
    (latest.load === oldest.load && latest.repsAtBestLoad > oldest.repsAtBestLoad)
  return !progressed
}
