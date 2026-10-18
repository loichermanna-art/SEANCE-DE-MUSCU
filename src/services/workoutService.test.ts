// Tests du parcours principal de la séance en direct (§26 Étape 4.3).
// Base IndexedDB simulée (fake-indexeddb) : le vrai service Dexie est exercé.

import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from './db'
import {
  addSet, finishSession, getActiveSession, getLastPerformance,
  getRestTimer, getSessionDetail, pauseSession, startRestTimer,
  startSession, stopRestTimer, validateSet,
} from './workoutService'
import { seedIfEmpty } from './seed'
import { newId } from './db'

const DAY_ID = 'jour-test-1'
const EXERCISE_ID = 'squat-barre'

async function setupProgram(): Promise<void> {
  await db.programs.put({
    id: 'prog-1', userId: 'local-user', name: 'Programme test',
    objective: 'Force', status: 'actif',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  })
  await db.programDays.put({
    id: DAY_ID, programId: 'prog-1', name: 'Jambes A', dayOrder: 0, scheduledWeekday: 2,
  })
  await db.programExercises.put({
    id: 'pe-1', programDayId: DAY_ID, exerciseId: EXERCISE_ID, exerciseOrder: 0,
    targetSets: 3, minReps: 8, maxReps: 10, targetLoad: 80, restSeconds: 120,
  })
}

beforeAll(async () => { await seedIfEmpty() })

beforeEach(async () => {
  await db.workoutSets.clear()
  await db.workoutExercises.clear()
  await db.workoutSessions.clear()
  await db.programExercises.clear()
  await db.programDays.clear()
  await db.programs.clear()
  await db.restTimers.clear()
})

describe('parcours principal : séance depuis un jour de programme', () => {
  it('démarre, snapshotne les cibles et pré-remplit les séries (§6.3, §7.3)', async () => {
    await setupProgram()
    const session = await startSession({ programId: 'prog-1', programDayId: DAY_ID, name: 'Programme test — Jambes A' })
    expect(session.status).toBe('en_cours')
    expect(session.startedAt).toBeTruthy()

    const detail = await getSessionDetail(session.id)
    expect(detail?.exercises).toHaveLength(1)
    const ex = detail!.exercises[0]
    expect(ex.exerciseNameSnapshot).toBe('Squat à la barre')
    // cibles copiées : modifier le programme ne changera pas la séance
    expect(ex.targetSets).toBe(3)
    expect(ex.targetLoad).toBe(80)
    expect(ex.restSeconds).toBe(120)
    // séries pré-créées et pré-remplies
    expect(ex.sets).toHaveLength(3)
    expect(ex.sets[0].loadValue).toBe(80)
    expect(ex.sets[0].repetitions).toBe(10) // max de la plage
    expect(ex.sets[0].status).toBe('en_saisie')
  })

  it('valide une série (sauvegarde progressive), crée la suivante et lance le repos (§7.2–7.4)', async () => {
    await setupProgram()
    const session = await startSession({ programId: 'prog-1', programDayId: DAY_ID, name: 'Programme test — Jambes A' })
    const detail = await getSessionDetail(session.id)
    const firstSet = detail!.exercises[0].sets[0]

    await validateSet(firstSet.id, { loadValue: 80, repetitions: 9 })

    const after = await getSessionDetail(session.id)
    const validated = after!.exercises[0].sets.find((s) => s.id === firstSet.id)
    expect(validated?.status).toBe('validee')
    expect(validated?.completedAt).toBeTruthy()

    // minuteur de repos démarré (120 s = cible de l’exercice)
    const timer = await getRestTimer()
    expect(timer).toBeTruthy()
    expect(timer!.durationSeconds).toBe(120)
    await stopRestTimer()
  })

  it('reproduit la série suivante pré-remplie de la série validée (§7.3)', async () => {
    await setupProgram()
    const session = await startSession({ programId: 'prog-1', programDayId: DAY_ID, name: 'Programme test — Jambes A' })
    const detail = await getSessionDetail(session.id)
    const firstSet = detail!.exercises[0].sets[0]

    await validateSet(firstSet.id, { loadValue: 82.5, repetitions: 9 })

    const after = await getSessionDetail(session.id)
    // la série 2 est pré-remplie avec les valeurs de la série 1
    const second = after!.exercises[0].sets.find((s) => s.setNumber === 2)
    expect(second?.loadValue).toBe(82.5)
    expect(second?.repetitions).toBe(9)
    expect(second?.status).toBe('en_saisie')
  })

  it('survit à une « interruption » : série en pause puis reprise (§7.5)', async () => {
    await setupProgram()
    const session = await startSession({ programId: 'prog-1', programDayId: DAY_ID, name: 'Programme test — Jambes A' })
    await pauseSession(session.id)
    const resumed = await getActiveSession()
    expect(resumed?.id).toBe(session.id)
    expect(resumed?.status).toBe('interrompue')
  })

  it('bilan de fin : séries non validées retirées, séance terminée (§7.6)', async () => {
    await setupProgram()
    const session = await startSession({ programId: 'prog-1', programDayId: DAY_ID, name: 'Programme test — Jambes A' })
    const detail = await getSessionDetail(session.id)
    await validateSet(detail!.exercises[0].sets[0].id, { loadValue: 80, repetitions: 8 })

    await finishSession(session.id, 8, 'Bonnes sensations')

    const finished = await db.workoutSessions.get(session.id)
    expect(finished?.status).toBe('terminee')
    expect(finished?.endedAt).toBeTruthy()
    expect(finished?.overallEffort).toBe(8)
    // les séries en saisie sont retirées, la validée conservée
    const remaining = await db.workoutSets.where('workoutExerciseId').equals(detail!.exercises[0].id).toArray()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].status).toBe('validee')
    // plus aucune séance active
    expect(await getActiveSession()).toBeUndefined()
  })

  it('refuse de démarrer tant qu’une séance est active', async () => {
    await setupProgram()
    await startSession({ programId: 'prog-1', programDayId: DAY_ID, name: 'Programme test — Jambes A' })
    await expect(startSession({ name: 'Autre' })).rejects.toThrow('déjà en cours')
  })

  it('l’historique alimente le pré-remplissage de la séance suivante (§7.3)', async () => {
    await setupProgram()
    const s1 = await startSession({ programId: 'prog-1', programDayId: DAY_ID, name: 'Programme test — Jambes A' })
    const d1 = await getSessionDetail(s1.id)
    await validateSet(d1!.exercises[0].sets[0].id, { loadValue: 85, repetitions: 8 })
    await finishSession(s1.id)

    // deuxième séance sur le même jour : pré-remplissage depuis l’historique
    const s2 = await startSession({ programId: 'prog-1', programDayId: DAY_ID, name: 'Programme test — Jambes A' })
    const d2 = await getSessionDetail(s2.id)
    expect(d2!.exercises[0].sets[0].loadValue).toBe(85)
    expect(d2!.exercises[0].sets[0].repetitions).toBe(8)

    const history = await getLastPerformance(EXERCISE_ID)
    expect(history.length).toBeGreaterThan(0)
    expect(history[history.length - 1].loadValue).toBe(85)
  })

  it('ajoute une série supplémentaire pré-remplie', async () => {
    await setupProgram()
    const session = await startSession({ programId: 'prog-1', programDayId: DAY_ID, name: 'Programme test — Jambes A' })
    const detail = await getSessionDetail(session.id)
    await validateSet(detail!.exercises[0].sets[0].id, { loadValue: 80, repetitions: 10 })

    const added = await addSet(detail!.exercises[0].id)
    expect(added.setType).toBe('travail')
    expect(added.loadValue).toBe(80)
    expect(added.repetitions).toBe(10)
  })

  it('minuteur de repos : horodatage absolu, ajustement, arrêt (§7.4)', async () => {
    await startRestTimer(90, 'Squat')
    const timer = await getRestTimer()
    expect(timer?.durationSeconds).toBe(90)
    // le repos survit au rechargement : même clé unique
    await startRestTimer(60)
    const all = await db.restTimers.toArray()
    expect(all).toHaveLength(1)
    await stopRestTimer()
    expect(await getRestTimer()).toBeUndefined()
  })

  it('séance libre sans programme : aucune série pré-créée', async () => {
    const session = await startSession({ name: 'Séance libre' })
    const detail = await getSessionDetail(session.id)
    expect(detail?.exercises).toHaveLength(0)
    expect(session.programDayId).toBeUndefined()
    void newId()
  })
})
