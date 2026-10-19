// GYM OS — Modèle de données applicatif (docs/03-modele-de-donnees.md)
// Ces types correspondent aux tables locales IndexedDB ET au schéma Supabase
// (supabase/schema.sql) : mêmes noms, aucune conversion lors de la synchro.

export type ExperienceLevel = 'debutant' | 'intermediaire' | 'avance'

export interface Profile {
  id: string
  displayName: string
  birthYear?: number
  heightCm?: number
  experienceLevel: ExperienceLevel
  /** Préférences libres : jours disponibles, matériel, exercices à éviter… */
  trainingPreferences: string
  createdAt: string
  updatedAt: string
}

export type GoalType =
  | 'prise_de_masse'
  | 'force'
  | 'perte_de_masse_grasse'
  | 'recomposition'
  | 'endurance_musculaire'
  | 'regularite'
  | 'groupe_cible'
  | 'condition_generale'

export interface Goal {
  id: string
  userId: string
  goalType: GoalType
  description: string
  targetValue?: number
  unit?: string
  priority: number // 1 = prioritaire
  status: 'actif' | 'atteint' | 'abandonne'
  createdAt: string
}

export interface MuscleGroup {
  id: string // slug : 'pectoraux', 'dos', ...
  name: string
}

export type MuscleRole = 'principal' | 'secondaire'

export interface ExerciseMuscle {
  id: string
  exerciseId: string
  muscleGroupId: string
  role: MuscleRole
}

export interface Exercise {
  id: string
  name: string
  alternativeNames?: string
  equipment: string // 'barre', 'halteres', 'machine', 'poulie', 'poids_du_corps'…
  movementType: string // 'poussee', 'tirage', 'jambes', 'gainage'…
  difficulty: 1 | 2 | 3
  description: string
  instructions: string
  commonMistakes?: string
  isCustom: boolean
  createdAt: string
}

export type DemonstrationStatus = 'publiee' | 'brouillon'

export interface ExerciseDemonstration {
  id: string
  exerciseId: string
  variantKey: string
  /** Clé résolue par une liste blanche locale, jamais du code exécutable. */
  animationKey: string
  animationVersion: number
  durationMs: number
  view: 'side' | 'front' | 'three-quarter'
  accessibilityLabel: string
  status: DemonstrationStatus
  updatedAt: string
}

export type ProgramStatus = 'actif' | 'pause' | 'archive'

export interface Program {
  id: string
  userId: string
  name: string
  objective: string
  status: ProgramStatus
  createdAt: string
  updatedAt: string
}

export interface ProgramDay {
  id: string
  programId: string
  name: string
  dayOrder: number
  /** 1 = lundi … 7 = dimanche, facultatif */
  scheduledWeekday?: number
  notes?: string
}

export interface ProgramExercise {
  id: string
  programDayId: string
  exerciseId: string
  exerciseOrder: number
  targetSets: number
  minReps: number
  maxReps: number
  targetLoad?: number
  restSeconds: number
  notes?: string
}

export type WorkoutStatus = 'planifiee' | 'en_cours' | 'terminee' | 'interrompue' | 'annulee'

export interface WorkoutSession {
  id: string
  userId: string
  programId?: string
  programDayId?: string
  name: string
  status: WorkoutStatus
  plannedAt?: string
  startedAt?: string
  endedAt?: string
  overallEffort?: number // 1 à 10, facultatif
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface WorkoutExercise {
  id: string
  workoutSessionId: string
  exerciseId?: string
  /** Copie du nom au moment de la séance : l'historique survit aux renommages (§6.3) */
  exerciseNameSnapshot: string
  exerciseOrder: number
  status: 'en_cours' | 'termine' | 'ignore' | 'remplace'
  notes?: string
}

export type SetType = 'echauffement' | 'travail'
export type SetStatus = 'en_saisie' | 'validee'

export interface WorkoutSet {
  id: string
  workoutExerciseId: string
  setNumber: number
  setType: SetType
  loadValue: number // 0 = poids du corps
  loadUnit: 'kg' | 'lb'
  repetitions: number
  rir?: number // répétitions en réserve, facultatif (§10.3)
  status: SetStatus
  completedAt?: string
  notes?: string
}

export interface RecoveryCheckin {
  id: string
  userId: string
  recordedAt: string
  energyLevel?: number // 1 à 5
  sleepDurationHours?: number
  sleepQuality?: number // 1 à 5
  generalFatigue?: number // 1 à 5
  notes?: string
}

export type PainType = 'courbature' | 'douleur_inhabituelle'

export interface MuscleSoreness {
  id: string
  recoveryCheckinId: string
  muscleGroupId: string
  severity: 0 | 1 | 2 | 3 | 4 // échelle §9.3
  painType: PainType
  notes?: string
}

export interface BodyMeasurement {
  id: string
  userId: string
  measuredAt: string
  measurementType: 'poids' | 'tour_taille' | 'tour_poitrine' | 'tour_bras' | 'tour_cuisse' | 'tour_hanches'
  value: number
  unit: string
  notes?: string
}

export interface UserPreferences {
  id: string
  userId: string
  unitSystem: 'kg' | 'lb'
  defaultRestSeconds: number
  theme: 'sombre'
}

/** Profil mono-utilisateur local (avant l'authentification, Phase 7) */
export const LOCAL_USER_ID = 'local-user'
