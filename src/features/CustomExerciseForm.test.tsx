// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MuscleGroup } from '../domain/types'
import { CustomExerciseForm } from './CustomExerciseForm'

const groups: MuscleGroup[] = [{ id: 'chest', name: 'Pectoraux' }, { id: 'triceps', name: 'Triceps' }]

describe('custom exercise form', () => {
  it('collects a complete exercise definition and primary/secondary muscle links', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<CustomExerciseForm groups={groups} busy={false} onCancel={vi.fn()} onSave={onSave} />)
    fireEvent.change(screen.getByLabelText('Nom *'), { target: { value: 'Pompes inclinées' } })
    fireEvent.change(screen.getByLabelText('Description *'), { target: { value: 'Poussée au poids du corps.' } })
    fireEvent.change(screen.getByLabelText('Consignes *'), { target: { value: 'Garde le tronc aligné.' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pectoraux' }))
    fireEvent.change(screen.getByLabelText('Rôle Pectoraux'), { target: { value: 'principal' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Triceps' }))
    fireEvent.change(screen.getByLabelText('Rôle Triceps'), { target: { value: 'secondaire' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer l’exercice' }))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Pompes inclinées', equipment: 'autre', movementType: 'autre', difficulty: 1,
        muscles: [{ muscleGroupId: 'chest', role: 'principal' }, { muscleGroupId: 'triceps', role: 'secondaire' }],
      }))
    })
  })
})
