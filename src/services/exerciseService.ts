// GYM OS — Service exercices personnalisés (§5.4).
// La bibliothèque de référence (seed) est en lecture seule ; l’utilisateur
// peut créer ses propres exercices, liés aux groupes musculaires.

import { db, newId, nowIso } from './db'
import type { Exercise, ExerciseMuscle, MuscleRole } from '../domain/types'

export interface CustomExerciseInput {
  name: string
  equipment: string
  movementType: string
  difficulty: 1 | 2 | 3
  description: string
  instructions: string
  commonMistakes?: string
  muscles: Array<{ muscleGroupId: string; role: MuscleRole }>
}

export async function createCustomExercise(input: CustomExerciseInput): Promise<Exercise> {
  const name = input.name.trim()
  if (name.length < 2) throw new Error('Le nom de l’exercice doit faire au moins 2 caractères.')
  if (input.muscles.length === 0) throw new Error('Indique au moins un groupe musculaire principal.')
  const exercise: Exercise = {
    id: newId(), name,
    equipment: input.equipment, movementType: input.movementType,
    difficulty: input.difficulty,
    description: input.description.trim(), instructions: input.instructions.trim(),
    commonMistakes: input.commonMistakes?.trim() || undefined,
    isCustom: true, createdAt: nowIso(),
  }
  const links: ExerciseMuscle[] = input.muscles.map((m) => ({
    id: newId(), exerciseId: exercise.id, muscleGroupId: m.muscleGroupId, role: m.role,
  }))
  await db.transaction('rw', [db.exercises, db.exerciseMuscles], async () => {
    await db.exercises.put(exercise)
    await db.exerciseMuscles.bulkPut(links)
  })
  return exercise
}

/** Seuls les exercices personnalisés sont supprimables (référence = données de l’app). */
export async function deleteCustomExercise(id: string): Promise<void> {
  const exercise = await db.exercises.get(id)
  if (!exercise || !exercise.isCustom) throw new Error('Seuls les exercices personnalisés peuvent être supprimés.')
  await db.transaction('rw', [db.exercises, db.exerciseMuscles], async () => {
    await db.exerciseMuscles.where('exerciseId').equals(id).delete()
    await db.exercises.delete(id)
  })
}
