import { describe, it, expect } from 'vitest'
import { buildLoadProgression, buildWeeklyBuckets, trendOf } from './history'
import type { WorkoutSet } from './types'

let counter = 0
function set(partial: Partial<WorkoutSet>): WorkoutSet {
  counter += 1
  return {
    id: `set-${counter}`,
    workoutExerciseId: 'we-1',
    setNumber: counter,
    setType: 'travail',
    loadValue: 60,
    loadUnit: 'kg',
    repetitions: 10,
    status: 'validee',
    ...partial,
  }
}

const D0 = '2026-10-12T10:00:00.000Z' // lundi
const D1 = '2026-10-14T10:00:00.000Z' // mercredi
const D2 = '2026-10-17T10:00:00.000Z' // samedi
// « aujourd'hui » fixé au dimanche 2026-10-18 pour des semaines déterministes
const NOW = new Date('2026-10-18T12:00:00.000Z').getTime()

describe('buildLoadProgression (§8.4)', () => {
  it('un point par séance = top set (charge max, ex æquo → reps max)', () => {
    const points = buildLoadProgression([
      { sessionId: 's1', date: D1, sets: [set({ loadValue: 60, repetitions: 8 }), set({ loadValue: 65, repetitions: 6 })] },
      { sessionId: 's2', date: D2, sets: [set({ loadValue: 65, repetitions: 7 }), set({ loadValue: 65, repetitions: 9 })] },
    ])
    expect(points).toHaveLength(2)
    expect(points[0]).toMatchObject({ loadValue: 65, repetitions: 6, volume: 390 })
    expect(points[1]).toMatchObject({ loadValue: 65, repetitions: 9, volume: 585 })
  })
  it('tri chronologique et exclusion des séances sans travail validé', () => {
    const points = buildLoadProgression([
      { sessionId: 's2', date: D2, sets: [set({ loadValue: 70, repetitions: 5 })] },
      { sessionId: 'sX', date: D1, sets: [set({ status: 'en_saisie', loadValue: 100, repetitions: 3 })] },
      { sessionId: 's1', date: D0, sets: [set({ loadValue: 60, repetitions: 10 })] },
      { sessionId: 'sW', date: D1, sets: [set({ setType: 'echauffement', loadValue: 30, repetitions: 12 })] },
    ])
    expect(points.map((p) => p.sessionId)).toEqual(['s1', 's2'])
  })
})

describe('buildWeeklyBuckets (§8)', () => {
  it('agrège par semaine (lundi → dimanche)', () => {
    const buckets = buildWeeklyBuckets([
      { sessionId: 'a', startedAt: D0, endedAt: D0, exercises: [{ name: 'Squat', sets: [set({ loadValue: 80, repetitions: 8 })] }] },
      { sessionId: 'b', startedAt: D1, endedAt: D1, exercises: [{ name: 'Bench', sets: [set({ loadValue: 60, repetitions: 10 }), set({ loadValue: 60, repetitions: 8 })] }] },
      { sessionId: 'c', startedAt: '2026-10-05T10:00:00.000Z', endedAt: '2026-10-05T10:00:00.000Z', exercises: [{ name: 'Squat', sets: [set({ loadValue: 70, repetitions: 8 })] }] },
    ], 3, NOW)
    // Semaine du 12/10 : 2 séances, 1440+480+... volume = 640 + (600+480) = 1720
    const week = buckets.find((b) => b.weekStart === '2026-10-12T00:00:00.000Z')
    expect(week).toBeTruthy()
    expect(week!.sessions).toBe(2)
    expect(week!.totalSets).toBe(3)
    expect(week!.totalReps).toBe(26)
    expect(week!.volume).toBe(1720)
    expect(week!.minutes).toBe(0) // startedAt == endedAt dans le fixture
    // Semaine précédente (05/10) : 1 séance
    const prev = buckets.find((b) => b.weekStart === '2026-10-05T00:00:00.000Z')
    expect(prev!.sessions).toBe(1)
  })
  it('volume null si uniquement poids du corps (rien d’inventé)', () => {
    const buckets = buildWeeklyBuckets([
      { sessionId: 'a', endedAt: D0, exercises: [{ name: 'Pompes', sets: [set({ loadValue: 0, repetitions: 20 })] }] },
    ], 1, NOW)
    expect(buckets[buckets.length - 1].volume).toBeNull()
    expect(buckets[buckets.length - 1].totalReps).toBe(20)
  })
})

describe('trendOf', () => {
  it('hausse, baisse, stable, insuffisant', () => {
    const mk = (loads: number[]) => loads.map((load, i) => ({
      sessionId: `s${i}`, date: `2026-10-0${i + 1}T00:00:00.000Z`,
      loadValue: load, repetitions: 8, volume: load * 8,
    }))
    expect(trendOf(mk([60, 62.5, 65]))).toBe('progress')
    expect(trendOf(mk([65, 62.5, 60]))).toBe('baisse')
    expect(trendOf(mk([60, 60, 60]))).toBe('stable')
    expect(trendOf(mk([60]))).toBe('insuffisant')
  })
})
