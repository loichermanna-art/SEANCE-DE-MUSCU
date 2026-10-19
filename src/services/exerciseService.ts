import type { Exercise, ExerciseMuscle, MuscleRole } from '../domain/types'
import { db, newId, nowIso } from './db'

export class ExerciseServiceError extends Error {
  constructor(message: string, public readonly code: 'VALIDATION' | 'NOT_FOUND' | 'IN_USE') {
    super(message)
    this.name = 'ExerciseServiceError'
  }
}

export interface CustomExerciseInput {
  id?: string
  name: string
  alternativeNames?: string
  equipment: string
  movementType: string
  difficulty: 1 | 2 | 3
  description: string
  instructions: string
  commonMistakes?: string
  muscles: Array<{ muscleGroupId: string; role: MuscleRole }>
}

const equipmentValues = ['barre', 'halteres', 'machine', 'poulie', 'poids_du_corps', 'autre']
const movementValues = ['poussee', 'tirage', 'jambes', 'gainage', 'autre']
function clean(value: string | undefined, label: string, max: number, required = false) {
  const normalized = (value ?? '').trim()
  if (required && !normalized) throw new ExerciseServiceError(`${label} est obligatoire.`, 'VALIDATION')
  if (normalized.length > max) throw new ExerciseServiceError(`${label} ne doit pas dépasser ${max} caractères.`, 'VALIDATION')
  return normalized
}

export function validateCustomExercise(input: CustomExerciseInput) {
  const name = clean(input.name, 'Le nom', 80, true)
  const alternativeNames = clean(input.alternativeNames, 'Les autres noms', 160)
  const description = clean(input.description, 'La description', 500, true)
  const instructions = clean(input.instructions, 'Les consignes', 2000, true)
  const commonMistakes = clean(input.commonMistakes, 'Les erreurs fréquentes', 1000)
  if (!equipmentValues.includes(input.equipment)) throw new ExerciseServiceError('Choisis un équipement valide.', 'VALIDATION')
  if (!movementValues.includes(input.movementType)) throw new ExerciseServiceError('Choisis un type de mouvement valide.', 'VALIDATION')
  if (![1, 2, 3].includes(input.difficulty)) throw new ExerciseServiceError('La difficulté doit être de 1 à 3.', 'VALIDATION')
  if (!input.muscles.length || !input.muscles.some(muscle => muscle.role === 'principal')) {
    throw new ExerciseServiceError('Choisis au moins un muscle principal.', 'VALIDATION')
  }
  if (new Set(input.muscles.map(muscle => muscle.muscleGroupId)).size !== input.muscles.length) {
    throw new ExerciseServiceError('Chaque groupe musculaire ne peut être sélectionné qu’une fois.', 'VALIDATION')
  }
  if (input.muscles.some(muscle => muscle.role !== 'principal' && muscle.role !== 'secondaire')) {
    throw new ExerciseServiceError('Le rôle musculaire est invalide.', 'VALIDATION')
  }
  return { ...input, name, alternativeNames, description, instructions, commonMistakes }
}

export const exerciseService = {
  async saveCustom(input: CustomExerciseInput): Promise<Exercise> {
    const valid = validateCustomExercise(input)
    return db.transaction('rw', db.exercises, db.exerciseMuscles, db.muscleGroups, async () => {
      for (const muscle of valid.muscles) {
        if (!await db.muscleGroups.get(muscle.muscleGroupId)) {
          throw new ExerciseServiceError('Un groupe musculaire choisi est introuvable.', 'NOT_FOUND')
        }
      }
      let exercise: Exercise
      if (valid.id) {
        const existing = await db.exercises.get(valid.id)
        if (!existing || !existing.isCustom) throw new ExerciseServiceError('Seuls les exercices personnalisés peuvent être modifiés.', 'NOT_FOUND')
        exercise = {
          ...existing, name: valid.name, alternativeNames: valid.alternativeNames, equipment: valid.equipment,
          movementType: valid.movementType, difficulty: valid.difficulty, description: valid.description,
          instructions: valid.instructions, commonMistakes: valid.commonMistakes,
        }
      } else {
        exercise = {
          id: newId(), name: valid.name, alternativeNames: valid.alternativeNames, equipment: valid.equipment,
          movementType: valid.movementType, difficulty: valid.difficulty, description: valid.description,
          instructions: valid.instructions, commonMistakes: valid.commonMistakes, isCustom: true, createdAt: nowIso(),
        }
      }
      await db.exercises.put(exercise)
      await db.exerciseMuscles.where('exerciseId').equals(exercise.id).delete()
      const links: ExerciseMuscle[] = valid.muscles.map(muscle => ({
        id: `${exercise.id}:${muscle.muscleGroupId}:${muscle.role}`,
        exerciseId: exercise.id, muscleGroupId: muscle.muscleGroupId, role: muscle.role,
      }))
      await db.exerciseMuscles.bulkPut(links)
      return exercise
    })
  },

  async deleteCustom(id: string): Promise<void> {
    await db.transaction('rw', [db.exercises, db.exerciseMuscles, db.programExercises, db.workoutExercises], async () => {
      const exercise = await db.exercises.get(id)
      if (!exercise || !exercise.isCustom) throw new ExerciseServiceError('Cet exercice personnalisé est introuvable.', 'NOT_FOUND')
      const planned = await db.programExercises.where('exerciseId').equals(id).count()
      if (planned) throw new ExerciseServiceError('Retire d’abord cet exercice des jours de programme avant de le supprimer.', 'IN_USE')
      const history = await db.workoutExercises.where('exerciseId').equals(id).toArray()
      await Promise.all(history.map(row => db.workoutExercises.update(row.id, { exerciseId: undefined })))
      await db.exerciseMuscles.where('exerciseId').equals(id).delete()
      await db.exercises.delete(id)
    })
  },
}
