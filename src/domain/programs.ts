// GYM OS — Règles métier des programmes (§6, docs/04-regles-metier.md)
// Fonctions PURES : aucune dépendance React ni base de données.

import { validateRestSeconds, type ValidationResult } from './validation'

/** Nom de programme : requis, 2–60 caractères (§19.1). */
export function validateProgramInput(input: { name: string; objective?: string }): ValidationResult {
  const errors: string[] = []
  const name = input.name.trim()
  if (name.length < 2) errors.push('Le nom du programme doit faire au moins 2 caractères.')
  if (name.length > 60) errors.push('Le nom du programme doit faire au plus 60 caractères.')
  if ((input.objective ?? '').length > 280) errors.push('L’objectif doit faire au plus 280 caractères.')
  return { ok: errors.length === 0, errors }
}

/** Jour de programme : nom requis, ordre entier ≥ 0, jour semaine 1–7 (§19.1). */
export function validateProgramDayInput(input: { name: string; dayOrder?: number; scheduledWeekday?: number }): ValidationResult {
  const errors: string[] = []
  const name = input.name.trim()
  if (name.length < 2) errors.push('Le nom du jour doit faire au moins 2 caractères.')
  if (name.length > 60) errors.push('Le nom du jour doit faire au plus 60 caractères.')
  if (input.dayOrder !== undefined && (!Number.isInteger(input.dayOrder) || input.dayOrder < 0)) {
    errors.push('L’ordre du jour doit être un entier positif.')
  }
  if (input.scheduledWeekday !== undefined && (input.scheduledWeekday < 1 || input.scheduledWeekday > 7)) {
    errors.push('Le jour de semaine doit être entre 1 (lundi) et 7 (dimanche).')
  }
  return { ok: errors.length === 0, errors }
}

/**
 * Cibles d’un exercice planifié (§6.1) : séries ≥ 1, plage de reps
 * cohérente (min ≤ max), charge ≥ 0, repos valide.
 */
export function validateProgramExerciseInput(input: {
  targetSets: number
  minReps: number
  maxReps: number
  targetLoad?: number
  restSeconds: number
}): ValidationResult {
  const errors: string[] = []
  if (!Number.isInteger(input.targetSets) || input.targetSets < 1 || input.targetSets > 20) {
    errors.push('Le nombre de séries cible doit être un entier entre 1 et 20.')
  }
  if (!Number.isInteger(input.minReps) || input.minReps < 0 || input.minReps > 200) {
    errors.push('Le minimum de répétitions doit être un entier entre 0 et 200.')
  }
  if (!Number.isInteger(input.maxReps) || input.maxReps < 0 || input.maxReps > 200) {
    errors.push('Le maximum de répétitions doit être un entier entre 0 et 200.')
  }
  if (input.minReps > input.maxReps) errors.push('Le minimum de répétitions ne peut pas dépasser le maximum.')
  if (input.targetLoad !== undefined && (input.targetLoad < 0 || input.targetLoad > 1000)) {
    errors.push('La charge cible doit être entre 0 et 1000 (0 = poids du corps).')
  }
  const rest = validateRestSeconds(input.restSeconds)
  if (!rest.ok) errors.push(...rest.errors)
  return { ok: errors.length === 0, errors }
}

/** « 1:30 » pour 90 s, « 45 s » en dessous d’une minute. */
export function formatRestSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

/** Résumé lisible des cibles d’un exercice planifié (§6.1).
 *  Champs optionnels : la fonction sert aussi pour les snapshots
 *  de séance (WorkoutExercise), où les cibles sont copiées. */
export function describeTargets(pe: {
  targetSets?: number
  minReps?: number
  maxReps?: number
  targetLoad?: number
  restSeconds?: number
}): string {
  const min = pe.minReps ?? 0
  const max = pe.maxReps ?? 0
  const reps = min === max ? `${min}` : `${min}–${max}`
  const load = pe.targetLoad !== undefined && pe.targetLoad > 0 ? ` @ ${pe.targetLoad} kg` : ''
  return `${pe.targetSets ?? 0} × ${reps} reps${load} · repos ${formatRestSeconds(pe.restSeconds ?? 0)}`
}

export const WEEKDAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
