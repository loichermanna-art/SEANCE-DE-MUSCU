// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildDemonstrationRows } from '../domain/exerciseDemonstrations'
import type { ExerciseDemonstration } from '../domain/types'
import ExerciseDemoPlayer from './ExerciseDemoPlayer'

type MediaListener = (event: MediaQueryListEvent) => void

function installMatchMedia(initiallyReduced = false) {
  const listeners = new Set<MediaListener>()
  const media = {
    matches: initiallyReduced,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: (_type: string, listener: MediaListener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: MediaListener) => listeners.delete(listener),
    addListener: (listener: MediaListener) => listeners.add(listener),
    removeListener: (listener: MediaListener) => listeners.delete(listener),
    dispatch(matches: boolean) {
      media.matches = matches
      const event = { matches, media: media.media, type: 'change' } as MediaQueryListEvent
      listeners.forEach((listener) => listener(event))
    },
  }
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => media) })
  return media
}

function demo(animationKey: string): ExerciseDemonstration {
  const row = buildDemonstrationRows().find((item) => item.animationKey === animationKey)
  if (!row) throw new Error(`Missing demonstration ${animationKey}`)
  return row
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  Reflect.deleteProperty(window, 'matchMedia')
})

describe('ExerciseDemoPlayer controls and motion', () => {
  it('plays through the movement, pauses, resumes and replays from the start', async () => {
    installMatchMedia(false)
    const demonstration = { ...demo('bench-press'), durationMs: 3000 }
    const { container } = render(<ExerciseDemoPlayer demonstration={demonstration} />)
    const phase = screen.getByRole('status')

    expect(phase.textContent).toContain('Départ.')
    fireEvent.click(screen.getByRole('button', { name: 'Lire la démonstration' }))
    expect(screen.getByRole('button', { name: 'Mettre en pause la démonstration' }).getAttribute('aria-pressed')).toBe('true')

    await act(async () => { vi.advanceTimersByTime(1000) })
    expect(container.querySelector('svg')?.getAttribute('data-stage')).toBe('1')
    expect(phase.textContent).toContain('Mouvement.')
    expect(container.querySelector('[data-demo-part="barbell"] line')?.getAttribute('y1')).toBe('101')

    fireEvent.click(screen.getByRole('button', { name: 'Mettre en pause la démonstration' }))
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(container.querySelector('svg')?.getAttribute('data-stage')).toBe('1')

    fireEvent.click(screen.getByRole('button', { name: 'Rejouer' }))
    expect(container.querySelector('svg')?.getAttribute('data-stage')).toBe('0')
    expect(screen.getByRole('button', { name: 'Mettre en pause la démonstration' })).toBeTruthy()
    await act(async () => { vi.advanceTimersByTime(1000) })
    expect(container.querySelector('svg')?.getAttribute('data-stage')).toBe('1')

    await act(async () => { vi.advanceTimersByTime(1000) })
    expect(container.querySelector('svg')?.getAttribute('data-stage')).toBe('2')
    await act(async () => { vi.advanceTimersByTime(1000) })
    expect(screen.getByRole('button', { name: 'Lire la démonstration' })).toBeTruthy()
  })

  it('applies the selected speed and allows direct stage selection', async () => {
    installMatchMedia(false)
    const { container } = render(<ExerciseDemoPlayer demonstration={demo('lat-pulldown')} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Vitesse de l’animation' }), { target: { value: '1.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lire la démonstration' }))

    await act(async () => { vi.advanceTimersByTime(1334) })
    expect(container.querySelector('svg')?.getAttribute('data-stage')).toBe('1')
    expect(container.querySelector('[data-demo-part="pulley-cable"]')?.getAttribute('d')).toContain('92')

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }))
    expect(container.querySelector('svg')?.getAttribute('data-stage')).toBe('2')
    expect(screen.getByRole('button', { name: 'Lire la démonstration' })).toBeTruthy()
  })

  it('keeps pull-up hands anchored to the fixed bar while the torso moves', () => {
    installMatchMedia(false)
    const { container } = render(<ExerciseDemoPlayer demonstration={demo('pull-up')} />)
    const handsAtStart = Array.from(container.querySelectorAll('[data-demo-part="hand"]')).map((node) => [node.getAttribute('cx'), node.getAttribute('cy')])
    const bar = container.querySelector('[data-demo-part="fixed-pull-up-bar"]')
    expect(bar).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Mouvement' }))
    const handsAtTop = Array.from(container.querySelectorAll('[data-demo-part="hand"]')).map((node) => [node.getAttribute('cx'), node.getAttribute('cy')])
    expect(handsAtTop).toEqual(handsAtStart)
    expect(container.querySelector('svg')?.getAttribute('data-stage')).toBe('1')
  })

  it('articulates squat knees while keeping the feet planted', () => {
    installMatchMedia(false)
    const { container } = render(<ExerciseDemoPlayer demonstration={demo('barbell-squat')} />)
    const kneesAtStart = Array.from(container.querySelectorAll('[data-demo-part="knee"]')).map((node) => [node.getAttribute('cx'), node.getAttribute('cy')])
    const anklesAtStart = Array.from(container.querySelectorAll('[data-demo-part="ankle"]')).map((node) => [node.getAttribute('cx'), node.getAttribute('cy')])

    fireEvent.click(screen.getByRole('button', { name: 'Mouvement' }))
    const kneesAtBottom = Array.from(container.querySelectorAll('[data-demo-part="knee"]')).map((node) => [node.getAttribute('cx'), node.getAttribute('cy')])
    const anklesAtBottom = Array.from(container.querySelectorAll('[data-demo-part="ankle"]')).map((node) => [node.getAttribute('cx'), node.getAttribute('cy')])
    expect(kneesAtBottom).not.toEqual(kneesAtStart)
    expect(anklesAtBottom).toEqual(anklesAtStart)
  })

  it('keeps the rowing torso hinged while moving the bar, and hinges at the hip for Romanian deadlifts', () => {
    installMatchMedia(false)
    const row = render(<ExerciseDemoPlayer demonstration={demo('barbell-row')} />)
    const rowTorsoStart = row.container.querySelector('[data-demo-part="body"] path')?.getAttribute('d')
    const rowBarStart = row.container.querySelector('[data-demo-part="barbell"] line')?.getAttribute('y1')
    fireEvent.click(screen.getByRole('button', { name: 'Mouvement' }))
    expect(row.container.querySelector('[data-demo-part="body"] path')?.getAttribute('d')).toBe(rowTorsoStart)
    expect(row.container.querySelector('[data-demo-part="barbell"] line')?.getAttribute('y1')).not.toBe(rowBarStart)
    row.unmount()

    const deadlift = render(<ExerciseDemoPlayer demonstration={demo('romanian-deadlift')} />)
    const torsoAtStart = deadlift.container.querySelector('[data-demo-part="body"] path')?.getAttribute('d')
    fireEvent.click(screen.getByRole('button', { name: 'Mouvement' }))
    expect(deadlift.container.querySelector('[data-demo-part="body"] path')?.getAttribute('d')).not.toBe(torsoAtStart)
  })

  it('stops on page visibility changes', async () => {
    installMatchMedia(false)
    const { container } = render(<ExerciseDemoPlayer demonstration={demo('barbell-row')} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lire la démonstration' }))
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.getByRole('button', { name: 'Lire la démonstration' })).toBeTruthy()
    await act(async () => { vi.advanceTimersByTime(3000) })
    expect(container.querySelector('svg')?.getAttribute('data-stage')).toBe('0')
  })

  it('switches to manual poses when reduced motion becomes active', async () => {
    const media = installMatchMedia(false)
    const { container } = render(<ExerciseDemoPlayer demonstration={demo('barbell-squat')} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lire la démonstration' }))
    act(() => media.dispatch(true))

    expect(screen.queryByRole('button', { name: 'Lire la démonstration' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'Vitesse de l’animation' })).toBeNull()
    expect(screen.getByText(/Mouvement réduit actif/)).toBeTruthy()
    await act(async () => { vi.advanceTimersByTime(4000) })
    expect(container.querySelector('svg')?.getAttribute('data-stage')).toBe('0')

    fireEvent.click(screen.getByRole('button', { name: 'Mouvement' }))
    expect(container.querySelector('svg')?.getAttribute('data-stage')).toBe('1')
  })

  it('shows the plank as a static pose without playback or speed controls', () => {
    installMatchMedia(false)
    const { container } = render(<ExerciseDemoPlayer demonstration={demo('plank')} />)
    expect(screen.getByRole('heading', { name: 'Maintien statique' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Lire la démonstration' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rejouer' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Choisir une étape de la démonstration' })).toBeNull()
    expect(container.querySelector('svg')?.getAttribute('data-view')).toBe('static')
  })
})
