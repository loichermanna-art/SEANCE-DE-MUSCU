// GYM OS — Données de référence initiales (§5, docs/03 §4)
// UNIQUEMENT des données de référence (muscles, exercices courants).
// Aucune performance fictive n'est créée : l'historique de l'utilisateur
// démarre vide (principe n°4 — pas de graphiques inventés).

import { db } from './db'
import type { Exercise, ExerciseMuscle, MuscleGroup } from '../domain/types'
import { buildDemonstrationRows } from '../domain/exerciseDemonstrations'

export const MUSCLE_GROUPS: MuscleGroup[] = [
  { id: 'pectoraux', name: 'Pectoraux' },
  { id: 'dos', name: 'Dos' },
  { id: 'epaules', name: 'Épaules' },
  { id: 'biceps', name: 'Biceps' },
  { id: 'triceps', name: 'Triceps' },
  { id: 'avant-bras', name: 'Avant-bras' },
  { id: 'quadriceps', name: 'Quadriceps' },
  { id: 'ischio-jambiers', name: 'Ischio-jambiers' },
  { id: 'fessiers', name: 'Fessiers' },
  { id: 'mollets', name: 'Mollets' },
  { id: 'abdominaux', name: 'Abdominaux' },
  { id: 'corps-entier', name: 'Corps entier' },
]

type SeedExercise = Omit<Exercise, 'isCustom' | 'createdAt'> & {
  muscles: Array<[string, 'principal' | 'secondaire']>
}

const E = (e: SeedExercise): SeedExercise => e

export const SEED_EXERCISES: SeedExercise[] = [
  E({ id: 'dev-couche-barre', name: 'Développé couché à la barre', equipment: 'barre', movementType: 'poussee', difficulty: 2, description: 'Exercice de base pour les pectoraux, allongé sur un banc, barre descendue à la poitrine puis poussée.', instructions: 'Omplates serrées, pieds au sol, descends la barre au niveau des tétons en contrôlant, pousse sans rebondir.', commonMistakes: 'Rebondir la barre sur la poitrine ; décoller les fesses du banc.', muscles: [['pectoraux', 'principal'], ['triceps', 'secondaire'], ['epaules', 'secondaire']] }),
  E({ id: 'dev-incline-halteres', name: 'Développé incliné aux haltères', equipment: 'halteres', movementType: 'poussee', difficulty: 2, description: 'Développé sur banc incliné (30–45°) ciblant le haut des pectoraux.', instructions: 'Descends les haltères de chaque côté de la poitrine, coudes à ~45–75°, pousse en rapprochant légèrement les haltères.', muscles: [['pectoraux', 'principal'], ['epaules', 'secondaire'], ['triceps', 'secondaire']] }),
  E({ id: 'ecartes-poulie', name: 'Écartés à la poulie vis-à-vis', equipment: 'poulie', movementType: 'poussee', difficulty: 1, description: 'Isolation des pectoraux aux poulies, bras semi-fléchis.', instructions: 'Coudes légèrement fléchis et fixes, ramène les poignées devant la poitrine en contractant les pectoraux.', muscles: [['pectoraux', 'principal'], ['epaules', 'secondaire']] }),
  E({ id: 'tractions-pronation', name: 'Tractions pronation', equipment: 'poids_du_corps', movementType: 'tirage', difficulty: 3, description: 'Tirage vertical au poids du corps, prise pronation plus large que les épaules.', instructions: 'Pars bras tendus, tire la poitrine vers la barre sans balancer le corps, contrôle la descente.', muscles: [['dos', 'principal'], ['biceps', 'secondaire'], ['avant-bras', 'secondaire']] }),
  E({ id: 'rowing-barre', name: 'Rowing barre buste penché', equipment: 'barre', movementType: 'tirage', difficulty: 2, description: 'Tirage horizontal à la barre, buste penché dos plat.', instructions: 'Dos plat à ~45°, tire la barre vers le bas du ventre en serrant les omoplates, sans arrondir le bas du dos.', commonMistakes: 'Arrondir le dos ; tirer avec l’élan.', muscles: [['dos', 'principal'], ['biceps', 'secondaire'], ['epaules', 'secondaire']] }),
  E({ id: 'tirage-vertical', name: 'Tirage vertical à la poulie', equipment: 'poulie', movementType: 'tirage', difficulty: 1, description: 'Tirage vertical machine pour le grand dorsal.', instructions: 'Tire la barre vers le haut de la poitrine, coudes vers le bas, sans basculer excessivement en arrière.', muscles: [['dos', 'principal'], ['biceps', 'secondaire']] }),
  E({ id: 'tirage-horizontal', name: 'Tirage horizontal à la poulie', equipment: 'poulie', movementType: 'tirage', difficulty: 1, description: 'Tirage horizontal assis, pour l’épaisseur du dos.', instructions: 'Buste droit, tire la poignée vers le ventre en serrant les omoplates, reviens en contrôlant.', muscles: [['dos', 'principal'], ['biceps', 'secondaire'], ['epaules', 'secondaire']] }),
  E({ id: 'dev-militaire', name: 'Développé militaire', equipment: 'barre', movementType: 'poussee', difficulty: 2, description: 'Développé vertical debout ou assis pour les épaules.', instructions: 'Gainage serré, pousse la barre au-dessus de la tête sans cambrer excessivement le bas du dos.', muscles: [['epaules', 'principal'], ['triceps', 'secondaire']] }),
  E({ id: 'elevations-laterales', name: 'Élévations latérales aux haltères', equipment: 'halteres', movementType: 'poussee', difficulty: 1, description: 'Isolation du deltoïde moyen.', instructions: 'Coudes légèrement fléchis, monte les haltères jusqu’à hauteur d’épaules sans hausser les trapèzes.', muscles: [['epaules', 'principal']] }),
  E({ id: 'curl-barre', name: 'Curl à la barre', equipment: 'barre', movementType: 'tirage', difficulty: 1, description: 'Flexion des coudes à la barre pour les biceps.', instructions: 'Coudes fixes contre le corps, monte sans balancer le buste, contrôle la descente complète.', muscles: [['biceps', 'principal'], ['avant-bras', 'secondaire']] }),
  E({ id: 'curl-incline', name: 'Curl incliné aux haltères', equipment: 'halteres', movementType: 'tirage', difficulty: 1, description: 'Curl sur banc incliné, biceps étirés.', instructions: 'Bras en arrière du corps sur le banc incliné, fléchis sans avancer les coudes.', muscles: [['biceps', 'principal']] }),
  E({ id: 'barre-au-front', name: 'Barre au front', equipment: 'barre', movementType: 'poussee', difficulty: 2, description: 'Extension des triceps allongé, barre descendue vers le front.', instructions: 'Coudes fixes pointés vers le plafond, descends la barre près du front en contrôlant, tends sans verrouiller brutalement.', muscles: [['triceps', 'principal']] }),
  E({ id: 'extension-poulie', name: 'Extension triceps à la poulie', equipment: 'poulie', movementType: 'poussee', difficulty: 1, description: 'Extension des coudes à la poulie haute.', instructions: 'Coudes collés au corps, tends complètement les bras, reviens jusqu’à ~90° en contrôlant.', muscles: [['triceps', 'principal']] }),
  E({ id: 'squat-barre', name: 'Squat à la barre', equipment: 'barre', movementType: 'jambes', difficulty: 3, description: 'Flexion de jambes complète, barre sur le haut du dos.', instructions: 'Pieds largeur d’épaules, descends hanches en arrière et en bas, genoux dans l’axe des pieds, dos gainé.', commonMistakes: 'Genoux qui rentrent ; talons qui se décollent.', muscles: [['quadriceps', 'principal'], ['fessiers', 'secondaire'], ['ischio-jambiers', 'secondaire']] }),
  E({ id: 'presse-cuisses', name: 'Presse à cuisses', equipment: 'machine', movementType: 'jambes', difficulty: 1, description: 'Poussée de charges guidée pour les jambes.', instructions: 'Pieds à hauteur moyenne sur le plateau, descends sans décoller le bassin, ne verrouille pas les genoux.', muscles: [['quadriceps', 'principal'], ['fessiers', 'secondaire']] }),
  E({ id: 'leg-extension', name: 'Leg extension', equipment: 'machine', movementType: 'jambes', difficulty: 1, description: 'Isolation des quadriceps en extension de genou.', instructions: 'Tends les jambes en contractant les quadriceps, redescends lentement sans laisser retomber la charge.', muscles: [['quadriceps', 'principal']] }),
  E({ id: 'leg-curl', name: 'Leg curl allongé', equipment: 'machine', movementType: 'jambes', difficulty: 1, description: 'Isolation des ischio-jambiers en flexion de genou.', instructions: 'Ramène les talons vers les fesses en contrôlant, sans décoller le bassin du banc.', muscles: [['ischio-jambiers', 'principal']] }),
  E({ id: 'sdt-roumain', name: 'Soulevé de terre roumain', equipment: 'barre', movementType: 'jambes', difficulty: 2, description: 'Charnière de hanche ciblant ischios et fessiers.', instructions: 'Genoux légèrement fléchis, pousse les hanches en arrière, barre le long des jambes, dos plat.', muscles: [['ischio-jambiers', 'principal'], ['fessiers', 'secondaire'], ['dos', 'secondaire']] }),
  E({ id: 'hip-thrust', name: 'Hip thrust à la barre', equipment: 'barre', movementType: 'jambes', difficulty: 2, description: 'Extension de hanche dos contre un banc, pour les fessiers.', instructions: 'Haut du dos sur le banc, pousse le bassin jusqu’à alignement, contracte les fessiers en haut sans cambrer.', muscles: [['fessiers', 'principal'], ['ischio-jambiers', 'secondaire']] }),
  E({ id: 'fentes-halteres', name: 'Fentes aux haltères', equipment: 'halteres', movementType: 'jambes', difficulty: 2, description: 'Travail unilatéral des jambes et de l’équilibre.', instructions: 'Grand pas contrôlé, buste droit, genou avant dans l’axe du pied, pousse sur le talon avant.', muscles: [['quadriceps', 'principal'], ['fessiers', 'secondaire']] }),
  E({ id: 'mollets-debout', name: 'Mollets debout', equipment: 'machine', movementType: 'jambes', difficulty: 1, description: 'Extension de cheville pour les mollets.', instructions: 'Amplitude complète, pause en position étirée, monte sur la pointe des pieds sans rebond.', muscles: [['mollets', 'principal']] }),
  E({ id: 'crunch', name: 'Crunch au sol', equipment: 'poids_du_corps', movementType: 'gainage', difficulty: 1, description: 'Flexion du tronc pour les abdominaux.', instructions: 'Enroule le buste en soufflant, sans tirer sur la nuque, redescends en contrôlant.', muscles: [['abdominaux', 'principal']] }),
  E({ id: 'planche', name: 'Planche (gainage)', equipment: 'poids_du_corps', movementType: 'gainage', difficulty: 1, description: 'Gainage statique ventral, tenu en secondes.', instructions: 'Corps aligné tête-bassin-talons, bassin ni trop haut ni affaissé, respire calmement.', muscles: [['abdominaux', 'principal'], ['corps-entier', 'secondaire']] }),
]

/** Complète les références manquantes sans remplacer les exercices personnalisés. Idempotent (§15.4). */
export async function seedIfEmpty(): Promise<void> {
  const now = new Date().toISOString()
  await db.transaction('rw', [db.muscleGroups, db.exercises, db.exerciseMuscles], async () => {
    await db.muscleGroups.bulkPut(MUSCLE_GROUPS)
    for (const seeded of SEED_EXERCISES) {
      const existing = await db.exercises.get(seeded.id)
      if (!existing) {
        const { muscles: _muscles, ...exercise } = seeded
        await db.exercises.put({ ...exercise, isCustom: false, createdAt: now })
      }
    }
    const links: ExerciseMuscle[] = SEED_EXERCISES.flatMap((exercise) =>
      exercise.muscles.map(([muscleGroupId, role]) => ({
        id: `${exercise.id}:${muscleGroupId}:${role}`,
        exerciseId: exercise.id,
        muscleGroupId,
        role,
      })),
    )
    await db.exerciseMuscles.bulkPut(links)
  })
  await seedExerciseDemonstrations()
}

/** Insère les références et applique les mises à jour de composition sans toucher aux variantes personnalisées. */
export async function seedExerciseDemonstrations(): Promise<void> {
  const rows = buildDemonstrationRows()
  await db.transaction('rw', db.exerciseDemonstrations, async () => {
    for (const row of rows) {
      const existing = await db.exerciseDemonstrations.get(row.id)
      if (!existing) {
        await db.exerciseDemonstrations.put(row)
      } else if (existing.variantKey === 'default' && existing.animationVersion < row.animationVersion) {
        // The renderer and its stage geometry changed. Refresh the stable built-in row,
        // but preserve whether the row was intentionally left unpublished locally.
        await db.exerciseDemonstrations.put({ ...row, status: existing.status })
      }
    }
  })
}
