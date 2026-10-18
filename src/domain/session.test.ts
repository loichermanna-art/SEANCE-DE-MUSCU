import { describe, it, expect } from 'vitest'
import {
  buildSessionExercises, computeSetPrefill, summarizeSession,
  formatDuration, restRemainingSeconds,
} from './session'
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

describe('buildSessionExercises (§6.3 snapshot)', () => {
  it('copie nom et cibles du programme dans la séance', () => {
    const drafts = buildSessionExercises([
      { exerciseId: 'dev-couche-barre', exerciseName: 'Squat à la barre', exerciseOrder: 2, targetSets: 4, minReps: 6, maxReps: 8, targetLoad: 80, restSeconds: 180 },
      { exerciseId: 'crunch', exerciseName: 'Crunch', exerciseOrder: 1, targetSets: 3, minReps: 15, maxReps: 20, restSeconds: 60 },
    ], 'session-1')
    expect(drafts).toHaveLength(2)
    // ordre respecté
    expect(drafts[0].exerciseNameSnapshot).toBe('Crunch')
    expect(drafts[1].exerciseNameSnapshot).toBe('Squat à la barre')
    // cibles copiées
    expect(drafts[1].targetSets).toBe(4)
    expect(drafts[1].minReps).toBe(6)
    expect(drafts[1].maxReps).toBe(8)
    expect(drafts[1].targetLoad).toBe(80)
    expect(drafts[1].restSeconds).toBe(180)
    expect(drafts[0].status).toBe('en_cours')
  })
})

describe('computeSetPrefill (§7.3)', () => {
  const targets = { minReps: 8, maxReps: 12, targetLoad: 60 }
  it('priorité à la dernière série de la séance en cours', () => {
    const p = computeSetPrefill({ ...targets, lastSetInSession: { loadValue: 62.5, repetitions: 9 }, lastSetInHistory: { loadValue: 50, repetitions: 10 } })
    expect(p).toEqual({ loadValue: 62.5, repetitions: 9 })
  })
  it('sinon dernière performance historique', () => {
    const p = computeSetPrefill({ ...targets, lastSetInSession: null, lastSetInHistory: { loadValue: 50, repetitions: 10 } })
    expect(p).toEqual({ loadValue: 50, repetitions: 10 })
  })
  it('sinon cibles du programme (charge cible, reps = max)', () => {
    const p = computeSetPrefill({ ...targets, lastSetInSession: null, lastSetInHistory: null })
    expect(p).toEqual({ loadValue: 60, repetitions: 12 })
  })
  it('poids du corps par défaut (0) sans cible ni historique', () => {
    const p = computeSetPrefill({ minReps: 5, maxReps: 10, lastSetInSession: null, lastSetInHistory: null })
    expect(p).toEqual({ loadValue: 0, repetitions: 10 })
  })
})

describe('summarizeSession (§7.6)', () => {
  it('calcule durée, séries, reps et volume', () => {
    const summary = summarizeSession(
      [{ name: 'Squat', sets: [set({ loadValue: 80, repetitions: 8 }), set({ loadValue: 80, repetitions: 8 }), set({ setType: 'echauffement', loadValue: 40, repetitions: 10 })] }],
      '2026-10-18T10:00:00.000Z', '2026-10-18T10:45:30.000Z',
    )
    expect(summary.durationSeconds).toBe(2730)
    expect(summary.totalSets).toBe(2) // échauffement exclu
    expect(summary.totalReps).toBe(16)
    expect(summary.volume).toBe(1280)
    expect(summary.exercises[0].bestLoad).toBe(80)
  })
  it('séries non validées exclues (§19.2)', () => {
    const summary = summarizeSession(
      [{ name: 'Squat', sets: [set({ loadValue: 80, repetitions: 8 }), set({ status: 'en_saisie', loadValue: 100, repetitions: 5 })] }],
      undefined, undefined,
    )
    expect(summary.totalSets).toBe(1)
    expect(summary.totalReps).toBe(8)
    expect(summary.volume).toBe(640) // 80 kg × 8 reps uniquement
  })
  it('volume null au poids du corps — rien d’inventé (§8.2)', () => {
    const summary = summarizeSession([{ name: 'Pompes', sets: [set({ loadValue: 0, repetitions: 20 })] }], undefined, undefined)
    expect(summary.volume).toBeNull()
  })
})

describe('formatDuration', () => {
  it('formate heures, minutes, secondes', () => {
    expect(formatDuration(3661)).toBe('1 h 1 min')
    expect(formatDuration(2700)).toBe('45 min')
    expect(formatDuration(38)).toBe('38 s')
    expect(formatDuration(0)).toBe('0 s')
  })
})

describe('restRemainingSeconds (§7.4)', () => {
  it('décompte depuis un horodatage absolu', () => {
    const now = Date.now()
    expect(restRemainingSeconds(new Date(now + 90_000).toISOString(), now)).toBe(90)
    expect(restRemainingSeconds(new Date(now - 1000).toISOString(), now)).toBe(0)
  })
})
