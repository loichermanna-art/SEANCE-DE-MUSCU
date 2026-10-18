// GYM OS — Validation des saisies (§19.1)
// Valeurs négatives ou incohérentes refusées ; unités toujours explicites.

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

export function validateSetInput(input: { loadValue: number; repetitions: number; rir?: number }): ValidationResult {
  const errors: string[] = []
  if (!Number.isFinite(input.loadValue) || input.loadValue < 0) errors.push('La charge doit être un nombre supérieur ou égal à 0.')
  if (input.loadValue > 1000) errors.push('Cette charge semble incohérente (plus de 1000).')
  if (!Number.isInteger(input.repetitions) || input.repetitions < 0) errors.push('Les répétitions doivent être un entier supérieur ou égal à 0.')
  if (input.repetitions > 1000) errors.push('Ce nombre de répétitions semble incohérent.')
  if (input.rir !== undefined && (input.rir < 0 || input.rir > 10)) errors.push('Le RIR doit être entre 0 et 10.')
  return { ok: errors.length === 0, errors }
}

export function validateMeasurement(value: number): ValidationResult {
  const errors: string[] = []
  if (!Number.isFinite(value) || value <= 0) errors.push('La mesure doit être un nombre strictement positif.')
  if (value > 1000) errors.push('Cette mesure semble incohérente.')
  return { ok: errors.length === 0, errors }
}

export function validateRestSeconds(seconds: number): ValidationResult {
  const errors: string[] = []
  if (!Number.isInteger(seconds) || seconds < 0 || seconds > 3600) errors.push('Le temps de repos doit être entre 0 et 3600 secondes.')
  return { ok: errors.length === 0, errors }
}
