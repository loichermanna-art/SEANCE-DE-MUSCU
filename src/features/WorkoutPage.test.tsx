// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { Exercise } from '../domain/types'
import { db } from '../services/db'
import { programExerciseService } from '../services/programExerciseService'
import { programService } from '../services/programService'
import WorkoutPage from './WorkoutPage'

const squat: Exercise = {
  id: 'workout-page-squat', name: 'Squat séance', equipment: 'barre', movementType: 'jambes', difficulty: 2,
  description: '', instructions: '', isCustom: false, createdAt: '2026-01-01T00:00:00.000Z',
}
let dayId = ''

afterEach(cleanup)

beforeEach(async () => {
  await db.transaction('rw', [db.programs, db.programDays, db.programExercises, db.workoutSessions, db.workoutExercises, db.workoutSets, db.exercises], async () => {
    await db.workoutSets.clear(); await db.workoutExercises.clear(); await db.workoutSessions.clear()
    await db.programExercises.clear(); await db.programDays.clear(); await db.programs.clear(); await db.exercises.clear()
    await db.exercises.add(squat)
  })
  const program = await programService.createProgram({ name: 'Programme UI', objective: '', status: 'actif' })
  const day = await programService.createDay(program.id, { name: 'Jambes', notes: '' })
  dayId = day.id
  await programExerciseService.add(day.id, { exerciseId: squat.id, targetSets: 2, minReps: 8, maxReps: 10, restSeconds: 30 })
})

describe('live workout page', () => {
  it('starts a planned day, validates a set, and leaves a resumable saved session', async () => {
    render(<MemoryRouter><WorkoutPage /></MemoryRouter>)
    fireEvent.change(await screen.findByLabelText('Choisir une journée de programme'), { target: { value: dayId } })
    fireEvent.click(screen.getByRole('button', { name: 'Démarrer cette séance' }))
    expect(await screen.findByRole('heading', { name: 'Squat séance' })).toBeTruthy()

    fireEvent.click(screen.getAllByRole('button', { name: 'Valider la série' })[0])
    await waitFor(() => expect(screen.getByText('Validée')).toBeTruthy())
    const session = await db.workoutSessions.where('status').equals('en_cours').first()
    expect(session).toBeDefined()
    expect(await db.workoutSets.where('status').equals('validee').count()).toBe(1)

    fireEvent.click(screen.getAllByRole('button', { name: 'Mettre en pause' })[0])
    await waitFor(async () => expect((await db.workoutSessions.get(session!.id))?.status).toBe('interrompue'))
    expect(screen.getByText('Séance sauvegardée et en pause')).toBeTruthy()
  })
})
