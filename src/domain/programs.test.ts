import { describe, it, expect } from 'vitest'
import {
  validateProgramInput, validateProgramDayInput, validateProgramExerciseInput,
  formatRestSeconds, describeTargets,
} from './programs'

describe('validation programme (§19.1)', () => {
  it('accepte un nom et un objectif valides', () => {
    expect(validateProgramInput({ name: 'Poussée', objective: 'Volume pectoraux' }).ok).toBe(true)
  })
  it('refuse un nom trop court ou trop long', () => {
    expect(validateProgramInput({ name: 'P' }).ok).toBe(false)
    expect(validateProgramInput({ name: 'x'.repeat(61) }).ok).toBe(false)
  })
})

describe('validation jour (§19.1)', () => {
  it('accepte un jour nommé, avec ou sans semaine', () => {
    expect(validateProgramDayInput({ name: 'Pectoraux / Triceps', dayOrder: 0 }).ok).toBe(true)
    expect(validateProgramDayInput({ name: 'Dos', scheduledWeekday: 3 }).ok).toBe(true)
  })
  it('refuse un jour de semaine hors 1–7', () => {
    expect(validateProgramDayInput({ name: 'Dos', scheduledWeekday: 8 }).ok).toBe(false)
  })
})

describe('validation cibles d’exercice (§6.1, §19.1)', () => {
  const base = { targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 }
  it('accepte des cibles cohérentes', () => {
    expect(validateProgramExerciseInput({ ...base, targetLoad: 60 }).ok).toBe(true)
    expect(validateProgramExerciseInput({ ...base, targetLoad: 0 }).ok).toBe(true) // poids du corps
  })
  it('refuse zéro série, un min > max, un repos absurde', () => {
    expect(validateProgramExerciseInput({ ...base, targetSets: 0 }).ok).toBe(false)
    expect(validateProgramExerciseInput({ ...base, minReps: 13, maxReps: 12 }).ok).toBe(false)
    expect(validateProgramExerciseInput({ ...base, restSeconds: -5 }).ok).toBe(false)
    expect(validateProgramExerciseInput({ ...base, restSeconds: 4000 }).ok).toBe(false)
  })
})

describe('formatage', () => {
  it('formate les durées de repos', () => {
    expect(formatRestSeconds(45)).toBe('45 s')
    expect(formatRestSeconds(60)).toBe('1:00')
    expect(formatRestSeconds(90)).toBe('1:30')
    expect(formatRestSeconds(150)).toBe('2:30')
  })
  it('décrit les cibles lisibles', () => {
    expect(describeTargets({ targetSets: 4, minReps: 6, maxReps: 8, targetLoad: 60, restSeconds: 120 }))
      .toBe('4 × 6–8 reps @ 60 kg · repos 2:00')
    expect(describeTargets({ targetSets: 3, minReps: 10, maxReps: 10, restSeconds: 45 }))
      .toBe('3 × 10 reps · repos 45 s')
  })
})
