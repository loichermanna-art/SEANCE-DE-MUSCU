// GYM OS — Règles d'adaptation liées à la récupération (§9.4)
// Règles explicites et prudentes (§9.5) : chaque résultat explique POURQUOI.

export interface SorenessInput {
  muscleGroupId: string
  muscleName: string
  severity: 0 | 1 | 2 | 3 | 4
  painType: 'courbature' | 'douleur_inhabituelle'
}

export interface RecoveryAdvice {
  situation: 'A' | 'B' | 'C' | 'D' | 'E'
  title: string
  message: string
  /** Muscles qui ont déclenché la règle — transparence (§9.6) */
  reasons: string[]
  medicalWarning: boolean
}

export function evaluateRecovery(params: {
  soreness: SorenessInput[]
  /** Groupes musculaires ciblés par la séance du jour */
  targetedMuscleIds: string[]
}): RecoveryAdvice {
  const { soreness, targetedMuscleIds } = params
  const reasons: string[] = []

  // Situation E — douleur inhabituelle ou gêne très importante : prudence maximale (§9.4 E, §9.5)
  const unusual = soreness.filter((s) => s.painType === 'douleur_inhabituelle' && s.severity >= 2)
  const extreme = soreness.filter((s) => s.severity >= 4)
  if (unusual.length > 0 || extreme.length > 0) {
    for (const s of [...unusual, ...extreme]) {
      reasons.push(`${s.muscleName} : ${s.painType === 'douleur_inhabituelle' ? 'douleur inhabituelle' : 'gêne très importante'} (${s.severity}/4)`)
    }
    return {
      situation: 'E',
      title: 'Prudence — travail intense déconseillé sur la zone concernée',
      message:
        'Ne force pas sur les muscles concernés. Si la douleur est vive, inhabituelle, ou limite tes mouvements, repose la zone et demande un avis médical si elle persiste. Une douleur musculaire extrême accompagnée d’urines foncées nécessite une évaluation médicale urgente.',
      reasons,
      medicalWarning: true,
    }
  }

  const targeted = soreness.filter((s) => targetedMuscleIds.includes(s.muscleGroupId) && s.severity > 0)
  const maxSeverity = targeted.length ? Math.max(...targeted.map((s) => s.severity)) : 0
  for (const s of targeted) reasons.push(`${s.muscleName} : courbatures ${s.severity}/4`)

  if (maxSeverity >= 3) {
    return {
      situation: 'D',
      title: 'Courbatures importantes sur les muscles du jour',
      message:
        'Envisage de réduire ou de déplacer le travail de ces muscles, ou de choisir une activité moins exigeante si elle reste confortable. La séance planifiée n’est jamais une obligation.',
      reasons,
      medicalWarning: false,
    }
  }
  if (maxSeverity === 2) {
    return {
      situation: 'C',
      title: 'Courbatures modérées — démarre prudemment',
      message:
        'Échauffement progressif, charge initiale prudente (ou une série de moins) : évalue ta réponse à l’échauffement avant de charger normalement.',
      reasons,
      medicalWarning: false,
    }
  }
  if (maxSeverity === 1) {
    return {
      situation: 'B',
      title: 'Courbatures légères — séance maintenue',
      message: 'Tu peux suivre le programme normalement, avec un échauffement soigné. Ajuste selon tes sensations.',
      reasons,
      medicalWarning: false,
    }
  }
  return {
    situation: 'A',
    title: 'Récupération satisfaisante',
    message: 'Aucune gêne signalée sur les muscles ciblés : le programme normal est proposé.',
    reasons: [],
    medicalWarning: false,
  }
}
