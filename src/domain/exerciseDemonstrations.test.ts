import { describe, expect, it } from 'vitest'
import { ANIMATION_KEYS, buildDemonstrationRows, DEMONSTRATION_CATALOG } from './exerciseDemonstrations'

const VALID_VIEWS = ['side', 'front', 'three_quarter', 'static'] as const

describe('DEMO-01 demonstration catalog', () => {
  it('provides exactly the 14 approved reference exercises with unique ids', () => {
    const rows = buildDemonstrationRows('2026-10-19T00:00:00.000Z')
    expect(rows).toHaveLength(14)
    expect(new Set(rows.map((row) => row.exerciseId)).size).toBe(14)
    expect(new Set(rows.map((row) => row.id)).size).toBe(14)
    expect(rows.every((row) => row.status === 'publiee')).toBe(true)
    expect(rows.every((row) => ANIMATION_KEYS.has(row.animationKey))).toBe(true)
    expect(rows.every((row) => row.animationVersion === 2)).toBe(true)
    expect(rows.every((row) => row.accessibilityLabel.trim().length > 0)).toBe(true)
  })

  it('uses view and duration values consistent with the model and specification', () => {
    const rows = buildDemonstrationRows()
    for (const row of rows) {
      expect(VALID_VIEWS).toContain(row.view)
      if (row.view === 'static') expect(row.durationMs).toBe(0)
      else expect(row.durationMs).toBeGreaterThanOrEqual(1000)
      if (row.view !== 'static') expect(row.durationMs).toBeLessThanOrEqual(12000)
    }
    expect(rows.find((row) => row.animationKey === 'plank')).toMatchObject({ view: 'static', durationMs: 0 })
    expect(rows.find((row) => row.animationKey === 'incline-dumbbell-press')?.view).toBe('three_quarter')
    expect(rows.find((row) => row.animationKey === 'lateral-raise')?.view).toBe('front')
  })

  it('keeps animation ids in a closed allow-list', () => {
    const rows = buildDemonstrationRows()
    const allowedKeys = DEMONSTRATION_CATALOG.map((item) => item.animationKey)
    expect(ANIMATION_KEYS.size).toBe(14)
    expect(rows.map((row) => row.animationKey)).toEqual(allowedKeys)
  })
})
