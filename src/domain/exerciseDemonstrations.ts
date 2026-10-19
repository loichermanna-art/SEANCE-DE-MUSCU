import type { ExerciseDemonstration } from './types'

/** Animation identifiers are a closed allow-list; database values never execute code. */
export const DEMONSTRATION_CATALOG = [
  { exerciseId: 'dev-couche-barre', animationKey: 'bench-press', variantKey: 'default', view: 'side', label: 'Développé couché : descendre la barre vers la poitrine puis pousser sans rebond.' },
  { exerciseId: 'dev-incline-halteres', animationKey: 'incline-dumbbell-press', variantKey: 'default', view: 'three-quarter', label: 'Développé incliné : descendre les haltères de chaque côté puis pousser de façon contrôlée.' },
  { exerciseId: 'tractions-pronation', animationKey: 'pull-up', variantKey: 'default', view: 'side', label: 'Tractions : partir bras tendus, tirer le corps vers la barre puis redescendre sans balancer.' },
  { exerciseId: 'rowing-barre', animationKey: 'barbell-row', variantKey: 'default', view: 'side', label: 'Rowing : garder le dos plat et tirer la barre vers le bas du ventre.' },
  { exerciseId: 'tirage-vertical', animationKey: 'lat-pulldown', variantKey: 'default', view: 'side', label: 'Tirage vertical : tirer la barre vers le haut de la poitrine, coudes vers le bas.' },
  { exerciseId: 'dev-militaire', animationKey: 'overhead-press', variantKey: 'default', view: 'side', label: 'Développé militaire : pousser la barre au-dessus de la tête en gardant le tronc stable.' },
  { exerciseId: 'elevations-laterales', animationKey: 'lateral-raise', variantKey: 'default', view: 'front', label: 'Élévations latérales : monter les haltères jusqu’à hauteur d’épaules puis redescendre.' },
  { exerciseId: 'curl-barre', animationKey: 'barbell-curl', variantKey: 'default', view: 'side', label: 'Curl : garder les coudes près du corps, fléchir puis étendre les bras avec contrôle.' },
  { exerciseId: 'squat-barre', animationKey: 'barbell-squat', variantKey: 'default', view: 'side', label: 'Squat : fléchir hanches et genoux dans l’axe des pieds, puis remonter en restant gainé.' },
  { exerciseId: 'presse-cuisses', animationKey: 'leg-press', variantKey: 'default', view: 'side', label: 'Presse : plier les genoux sans décoller le bassin puis repousser sans verrouillage brutal.' },
  { exerciseId: 'sdt-roumain', animationKey: 'romanian-deadlift', variantKey: 'default', view: 'side', label: 'Soulevé de terre roumain : pousser les hanches en arrière, barre proche des jambes, puis se redresser.' },
  { exerciseId: 'hip-thrust', animationKey: 'hip-thrust', variantKey: 'default', view: 'side', label: 'Hip thrust : monter le bassin jusqu’à alignement du tronc, sans hyperextension lombaire.' },
  { exerciseId: 'crunch', animationKey: 'crunch', variantKey: 'default', view: 'side', label: 'Crunch : enrouler le haut du tronc sans tirer sur la nuque, puis revenir lentement.' },
  { exerciseId: 'planche', animationKey: 'plank', variantKey: 'default', view: 'side', label: 'Planche : garder tête, tronc, bassin et talons alignés et respirer calmement.' },
] as const

export type AnimationKey = typeof DEMONSTRATION_CATALOG[number]['animationKey']
export const ANIMATION_KEYS = new Set<string>(DEMONSTRATION_CATALOG.map((item) => item.animationKey))

export function buildDemonstrationRows(now = new Date().toISOString()): ExerciseDemonstration[] {
  return DEMONSTRATION_CATALOG.map((item) => ({
    id: `demo:${item.exerciseId}:${item.variantKey}`,
    exerciseId: item.exerciseId,
    variantKey: item.variantKey,
    animationKey: item.animationKey,
    animationVersion: 1,
    durationMs: item.animationKey === 'plank' ? 0 : 3200,
    view: item.view,
    accessibilityLabel: item.label,
    status: 'publiee' as const,
    updatedAt: now,
  }))
}
