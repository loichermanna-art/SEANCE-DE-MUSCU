import { describe, expect, it } from 'vitest'
import { ProgramServiceError, validateDay, validateProgram } from './programService'

describe('program validation', () => {
  it('trims required names and optional objective', () => {
    expect(validateProgram({ name: '  Force  ', objective: '  Progression  ', status: 'actif' })).toEqual({
      name: 'Force', objective: 'Progression', status: 'actif',
    })
  })

  it('rejects a blank program name and overlong fields', () => {
    expect(() => validateProgram({ name: '   ', objective: '', status: 'actif' })).toThrow(ProgramServiceError)
    expect(() => validateProgram({ name: 'x'.repeat(81), objective: '', status: 'actif' })).toThrow(/80 caractères/)
    expect(() => validateProgram({ name: 'Force', objective: 'x'.repeat(241), status: 'actif' })).toThrow(/240 caractères/)
  })

  it('accepts optional weekday and trims day fields', () => {
    expect(validateDay({ name: '  Jambes ', scheduledWeekday: 2, notes: '  Technique  ' })).toEqual({
      name: 'Jambes', scheduledWeekday: 2, notes: 'Technique',
    })
    expect(validateDay({ name: 'Dos' })).toEqual({ name: 'Dos', scheduledWeekday: undefined, notes: '' })
  })

  it('rejects blank/overlong day fields and invalid weekdays', () => {
    expect(() => validateDay({ name: ' ' })).toThrow(/obligatoire/)
    expect(() => validateDay({ name: 'x'.repeat(61) })).toThrow(/60 caractères/)
    expect(() => validateDay({ name: 'Dos', scheduledWeekday: 8 })).toThrow(/jour de semaine/)
    expect(() => validateDay({ name: 'Dos', notes: 'x'.repeat(501) })).toThrow(/500 caractères/)
  })
})
