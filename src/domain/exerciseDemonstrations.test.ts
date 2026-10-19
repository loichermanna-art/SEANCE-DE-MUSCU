import { describe, expect, it } from 'vitest'
import { ANIMATION_KEYS, buildDemonstrationRows, DEMONSTRATION_CATALOG } from './exerciseDemonstrations'

describe('DEMO-01 demonstration catalog', () => {
  it('provides exactly the 14 approved reference exercises', () => {
    const rows = buildDemonstrationRows('2026-10-19T00:00:00.000Z')
    expect(rows).toHaveLength(14)
    expect(new Set(rows.map((row) => row.exerciseId)).size).toBe(14)
    expect(rows.every((row) => row.status === 'publiee')).toBe(true)
    expect(rows.every((row) => ANIMATION_KEYS.has(row.animationKey))).toBe(true)
  })

  it('uses unique ids and a closed animation allow-list', () => {
    const rows = buildDemonstrationRows()
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length)
    expect(DENOMINATIONS).toEqual(expect.arrayContaining(rows.map((row) => row.animationKey)))
  })
})

const DENOMINATIONS = DEMONSTRATION_CATALOG.map((item) => item.animationKey)
