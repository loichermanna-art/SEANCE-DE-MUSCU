import { describe, it, expect } from 'vitest'
import { computeVolume, computeTotalReps, computeExerciseRecords } from './calculations'
import { suggestDoubleProgression, detectStagnation } from './progression'
import { evaluateRecovery } from './recovery'
import { validateSetInput } from './validation'
import type { WorkoutSet } from './types'

let counter = 0
function set(partial: Partial<WorkoutSet>): WorkoutSet {
  counter += 1
  return {
    id: `set-${counter}`,
    workoutExerciseId: 'we-1',
    setNumber: counter,
    setType: 'travail',
    loadValue: 20,
    loadUnit: 'kg',
    repetitions: 10,
    status: 'validee',
    ...partial,
  }
}

describe('computeVolume (§8.2)', () => {
  it('somme charge × reps des séries de travail validées', () => {
    const sets = [set({ loadValue: 20, repetitions: 10 }), set({ loadValue: 20, repetitions: 8 })]
    expect(computeVolume(sets)).toBe(360)
  })
  it('exclut échauffement et séries non validées', () => {
    const sets = [
      set({ loadValue: 20, repetitions: 10 }),
      set({ setType: 'echauffement', loadValue: 10, repetitions: 12 }),
      set({ status: 'en_saisie', loadValue: 100, repetitions: 100 }),
    ]
    expect(computeVolume(sets)).toBe(200)
  })
  it('retourne null au poids du corps (pas de volume « exact » inventé)', () => {
    expect(computeVolume([set({ loadValue: 0, repetitions: 15 })])).toBeNull()
  })
  it('total des répétitions', () => {
    expect(computeTotalReps([set({ repetitions: 10 }), set({ repetitions: 9 })])).toBe(19)
  })
})

describe('computeExerciseRecords (§8.4)', () => {
  it('détecte charge max, reps max et meilleur volume de séance', () => {
    const records = computeExerciseRecords([
      [set({ loadValue: 20, repetitions: 10 }), set({ loadValue: 20, repetitions: 10 })],
      [set({ loadValue: 25, repetitions: 6 }), set({ loadValue: 22.5, repetitions: 8 })],
    ])
    expect(records.bestLoad).toBe(25)
    expect(records.bestReps).toBe(10)
    expect(records.bestSessionVolume).toBe(400)
    expect(records.totalWorkSets).toBe(4)
  })
})

describe('progression double (§10.2)', () => {
  it('propose une hausse quand le haut de plage est atteint partout', () => {
    const last = [set({ repetitions: 12 }), set({ repetitions: 12 }), set({ repetitions: 12 })]
    const s = suggestDoubleProgression({ minReps: 8, maxReps: 12, targetSets: 3, equipment: 'barre', lastWorkSets: last })
    expect(s.type).toBe('augmenter_charge')
    expect(s.suggestedLoad).toBe(22.5)
  })
  it('conserve la charge sinon', () => {
    const last = [set({ repetitions: 10 }), set({ repetitions: 10 }), set({ repetitions: 9 })]
    const s = suggestDoubleProgression({ minReps: 8, maxReps: 12, targetSets: 3, equipment: 'barre', lastWorkSets: last })
    expect(s.type).toBe('viser_plus_de_reps')
  })
  it('données insuffisantes sans historique', () => {
    const s = suggestDoubleProgression({ minReps: 8, maxReps: 12, targetSets: 3, equipment: 'barre', lastWorkSets: [] })
    expect(s.type).toBe('donnees_insuffisantes')
  })
})

describe('stagnation (§10.4)', () => {
  it('détecte 3 séances sans progression', () => {
    const session = () => [set({ loadValue: 40, repetitions: 8 }), set({ loadValue: 40, repetitions: 8 })]
    expect(detectStagnation([session(), session(), session()])).toBe(true)
  })
  it('pas de stagnation si progression', () => {
    const old = [set({ loadValue: 35, repetitions: 8 })]
    const mid = [set({ loadValue: 37.5, repetitions: 8 })]
    const recent = [set({ loadValue: 40, repetitions: 8 })]
    expect(detectStagnation([recent, mid, old])).toBe(false)
  })
})

describe('récupération (§9.4)', () => {
  it('situation A sans gêne', () => {
    expect(evaluateRecovery({ soreness: [], targetedMuscleIds: ['pectoraux'] }).situation).toBe('A')
  })
  it('situation E sur douleur inhabituelle, avec alerte', () => {
    const advice = evaluateRecovery({
      soreness: [{ muscleGroupId: 'dos', muscleName: 'Dos', severity: 3, painType: 'douleur_inhabituelle' }],
      targetedMuscleIds: ['dos'],
    })
    expect(advice.situation).toBe('E')
    expect(advice.medicalWarning).toBe(true)
    expect(advice.reasons.length).toBeGreaterThan(0) // la règle explique pourquoi
  })
  it('situation D sur courbatures importantes ciblées', () => {
    const advice = evaluateRecovery({
      soreness: [{ muscleGroupId: 'quadriceps', muscleName: 'Quadriceps', severity: 3, painType: 'courbature' }],
      targetedMuscleIds: ['quadriceps'],
    })
    expect(advice.situation).toBe('D')
  })
  it('courbatures sur un muscle NON ciblé ne dégradent pas la séance', () => {
    const advice = evaluateRecovery({
      soreness: [{ muscleGroupId: 'quadriceps', muscleName: 'Quadriceps', severity: 3, painType: 'courbature' }],
      targetedMuscleIds: ['pectoraux'],
    })
    expect(advice.situation).toBe('A')
  })
})

describe('validation (§19.1)', () => {
  it('refuse les valeurs négatives', () => {
    expect(validateSetInput({ loadValue: -5, repetitions: 10 }).ok).toBe(false)
    expect(validateSetInput({ loadValue: 20, repetitions: -1 }).ok).toBe(false)
  })
  it('accepte le poids du corps (charge 0)', () => {
    expect(validateSetInput({ loadValue: 0, repetitions: 15 }).ok).toBe(true)
  })
})
