// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Exercise } from '../domain/types'
import { db } from '../services/db'
import { programService } from '../services/programService'
import { ProgramDayExercises } from './ProgramDayExercises'

const exercise: Exercise = {
  id: 'ui-squat', name: 'Squat de test', equipment: 'barre', movementType: 'jambes', difficulty: 2,
  description: '', instructions: '', isCustom: false, createdAt: '2026-01-01T00:00:00.000Z',
}
let dayId = ''

afterEach(cleanup)

beforeEach(async () => {
  await db.transaction('rw', db.programs, db.programDays, db.programExercises, db.exercises, async () => {
    await db.programExercises.clear()
    await db.programDays.clear()
    await db.programs.clear()
    await db.exercises.put(exercise)
  })
  const program = await programService.createProgram({ name: 'Programme UI', objective: '', status: 'actif' })
  dayId = (await programService.createDay(program.id, { name: 'Jambes', notes: '' })).id
})

describe('program day exercise manager', () => {
  it('adds and edits a real planned exercise from the library', async () => {
    render(<ProgramDayExercises dayId={dayId} disabled={false} />)
    expect(await screen.findByText('Aucun exercice planifié. Ajoute-en un depuis la bibliothèque.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    fireEvent.change(screen.getByLabelText('Exercice'), { target: { value: exercise.id } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter l’exercice' }))
    expect(await screen.findByText('1. Squat de test')).toBeTruthy()
    expect(await screen.findByText('3 × 8–12 · repos 90 s')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Modifier Squat de test' }))
    fireEvent.change(screen.getByLabelText('Nombre de séries'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(screen.getByText('4 × 8–12 · repos 90 s')).toBeTruthy())
    expect((await db.programExercises.where('programDayId').equals(dayId).first())?.targetSets).toBe(4)
  })

  it('shows a validation message instead of saving an invalid repetition range', async () => {
    render(<ProgramDayExercises dayId={dayId} disabled={false} />)
    await screen.findByText('Aucun exercice planifié. Ajoute-en un depuis la bibliothèque.')
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    fireEvent.change(screen.getByLabelText('Exercice'), { target: { value: exercise.id } })
    fireEvent.change(screen.getByLabelText('Répétitions minimum'), { target: { value: '15' } })
    fireEvent.change(screen.getByLabelText('Répétitions maximum'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter l’exercice' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Le minimum de répétitions ne peut pas dépasser le maximum.')
    expect(await db.programExercises.count()).toBe(0)
  })
})
