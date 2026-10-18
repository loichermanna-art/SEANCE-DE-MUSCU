import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  AlertTriangle, Check, Clock, Dumbbell,
  Flag, Pause, Play, Plus, RotateCcw, Search, Square, StopCircle, Trash2, X,
} from 'lucide-react'
import { db } from '../services/db'
import { getPreferences } from '../services/profileService'
import {
  abandonSession, addExerciseToSession, addSet, deleteSet, finishSession,
  getActiveSession, getLastPerformance, getSessionDetail, listStartableDays,
  pauseSession, removeExerciseFromSession, resumeSession, setExerciseNotes,
  setExerciseStatus, startSession,
  updateSet, validateSet, type SessionDetail,
} from '../services/workoutService'
import { searchExercises } from '../services/programService'
import { formatDuration, summarizeSession, type SessionSummary } from '../domain/session'
import { describeTargets } from '../domain/programs'
import { validateSetInput } from '../domain/validation'
import { Card, EmptyState, PageTitle } from '../components/ui'
import Modal from '../components/Modal'
import type { WorkoutExercise, WorkoutSession, WorkoutSet } from '../domain/types'

const inputCls = 'rounded-lg border border-line bg-surface2/60 px-2 py-1.5 text-sm outline-none focus:border-accent numeric'

/** L'horloge tourne même si le calcul n'est pas affiché (§7.5). */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [active])
  return now
}

/* ————————————————— Démarrage ————————————————— */

function StartScreen({ onStartDay, onStartFree }: {
  onStartDay: (dayId: string) => void
  onStartFree: () => void
}) {
  const days = useLiveQuery(() => listStartableDays(), [])

  return (
    <div>
      <PageTitle title="Séance en direct" subtitle="Démarre depuis un jour de programme ou en séance libre — chaque série est sauvegardée au fur et à mesure." />

      {/* Une séance en_cours ou interrompue est reprise automatiquement
          (§7.5) : LiveSession s'affiche dès qu'une séance active existe. */}

      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Depuis un programme</h2>
      {!days || days.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            Aucun programme actif. Crée d'abord un programme avec des jours —{' '}
            <Link to="/programme" className="font-semibold text-accent hover:underline">ouvrir les programmes</Link>.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {days.map(({ day, programName, exerciseCount, targets }) => (
            <Card key={day.id} className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{programName}</p>
              <h3 className="font-bold">{day.name}</h3>
              <p className="text-sm text-muted">
                {exerciseCount} exercice{exerciseCount > 1 ? 's' : ''}
                {targets.length > 0 ? ` — ${targets.reduce((acc, t) => acc + t.targetSets, 0)} séries prévues` : ''}
              </p>
              <button
                onClick={() => onStartDay(day.id)}
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink transition hover:brightness-110"
              >
                <Play size={16} /> Commencer ce jour
              </button>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-muted">Sans programme</h2>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">Séance libre</h3>
            <p className="text-sm text-muted">Tu ajoutes les exercices au fur et à mesure.</p>
          </div>
          <button onClick={onStartFree} className="inline-flex items-center gap-2 rounded-xl border border-accent/50 bg-accent/10 px-4 py-2.5 text-sm font-bold text-accent transition hover:bg-accent/20">
            <Plus size={16} /> Démarrer une séance libre
          </button>
        </div>
      </Card>
    </div>
  )
}

/* ————————————————— Ligne de série ————————————————— */

function SetRow({ set, onValidate, onUpdate, onDelete }: {
  set: WorkoutSet
  onValidate: (id: string, values: { loadValue: number; repetitions: number; rir?: number }) => void
  onUpdate: (id: string, patch: Partial<Pick<WorkoutSet, 'loadValue' | 'repetitions' | 'rir' | 'setType' | 'notes'>>) => void
  onDelete: (id: string) => void
}) {
  const [load, setLoad] = useState(String(set.loadValue))
  const [reps, setReps] = useState(String(set.repetitions))
  const [rir, setRir] = useState(set.rir !== undefined ? String(set.rir) : '')
  const [error, setError] = useState('')
  const validated = set.status === 'validee'

  useEffect(() => {
    setLoad(String(set.loadValue))
    setReps(String(set.repetitions))
    setRir(set.rir !== undefined ? String(set.rir) : '')
  }, [set.id, set.loadValue, set.repetitions, set.rir, set.status])

  function commit(patch: Partial<Pick<WorkoutSet, 'loadValue' | 'repetitions' | 'rir' | 'setType' | 'notes'>>) {
    if (validated) return
    onUpdate(set.id, patch)
  }

  function onValidateClick() {
    const loadValue = load.trim() === '' ? 0 : Number(load.replace(',', '.'))
    const repetitions = Number(reps)
    const rirValue = rir.trim() === '' ? undefined : Number(rir)
    const v = validateSetInput({ loadValue, repetitions, rir: rirValue })
    if (!v.ok) { setError(v.errors[0]); return }
    setError('')
    onValidate(set.id, { loadValue, repetitions, rir: rirValue })
  }

  return (
    <li className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 ${validated ? 'border-success/40 bg-success/5' : 'border-line bg-surface2/30'}`}>
      <span className={`w-7 shrink-0 text-center text-xs font-bold ${validated ? 'text-success' : 'text-muted'}`}>
        {validated ? <Check size={15} className="mx-auto" /> : `S${set.setNumber}`}
      </span>
      <select
        value={set.setType}
        disabled={validated}
        onChange={(e) => commit({ setType: e.target.value as WorkoutSet['setType'] })}
        className="rounded-lg border border-line bg-surface px-1.5 py-1.5 text-xs outline-none focus:border-accent disabled:opacity-60"
        aria-label="Type de série"
      >
        <option value="travail">Travail</option>
        <option value="echauffement">Échauffement</option>
      </select>
      <label className="flex items-center gap-1">
        <span className="sr-only">Charge (kg)</span>
        <input
          inputMode="decimal" value={load} disabled={validated}
          onChange={(e) => { setLoad(e.target.value); commit({ loadValue: e.target.value === '' ? 0 : Number(e.target.value.replace(',', '.')) }) }}
          className={`${inputCls} w-20`} placeholder="kg"
        />
        <span className="text-xs text-muted">kg</span>
      </label>
      <label className="flex items-center gap-1">
        <span className="sr-only">Répétitions</span>
        <input
          inputMode="numeric" value={reps} disabled={validated}
          onChange={(e) => { setReps(e.target.value); commit({ repetitions: e.target.value === '' ? 0 : Number(e.target.value) }) }}
          className={`${inputCls} w-16`} placeholder="reps"
        />
        <span className="text-xs text-muted">reps</span>
      </label>
      <label className="flex items-center gap-1" title="Répétitions en réserve (facultatif, §10.3)">
        <span className="text-xs text-muted">RIR</span>
        <input
          inputMode="numeric" value={rir} disabled={validated}
          onChange={(e) => { setRir(e.target.value); commit({ rir: e.target.value === '' ? undefined : Number(e.target.value) }) }}
          className={`${inputCls} w-14`} placeholder="0–4"
        />
      </label>
      {validated ? (
        <span className="ml-auto text-xs text-muted">
          {set.completedAt ? new Date(set.completedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'validée'}
        </span>
      ) : (
        <div className="ml-auto flex items-center gap-1">
          {error ? <span className="mr-1 text-xs text-danger">{error}</span> : null}
          <button onClick={() => onDelete(set.id)} className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger" aria-label="Supprimer la série" title="Supprimer cette série">
            <Trash2 size={15} />
          </button>
          <button
            onClick={onValidateClick}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-bold text-accent-ink transition hover:brightness-110"
          >
            <Check size={14} /> Valider
          </button>
        </div>
      )}
    </li>
  )
}

/* ————————————————— Carte exercice ————————————————— */

function ExerciseCard({ exercise, index, onValidate, onUpdateSet, onDeleteSet, onAddSet, onStatus, onRemove, onNotes }: {
  exercise: WorkoutExercise & { sets: WorkoutSet[] }
  index: number
  onValidate: (set: WorkoutSet) => void
  onUpdateSet: (id: string, patch: Partial<Pick<WorkoutSet, 'loadValue' | 'repetitions' | 'rir' | 'setType' | 'notes'>>) => void
  onDeleteSet: (id: string) => void
  onAddSet: (exerciseId: string) => void
  onStatus: (id: string, status: WorkoutExercise['status']) => void
  onRemove: (id: string) => void
  onNotes: (id: string, notes: string) => void
}) {
  const lastPerf = useLiveQuery(
    () => (exercise.exerciseId ? getLastPerformance(exercise.exerciseId) : Promise.resolve([])),
    [exercise.exerciseId],
  )
  const [showNotes, setShowNotes] = useState(false)
  const validated = exercise.sets.filter((s) => s.status === 'validee')
  const done = exercise.status !== 'en_cours'
  const targetLine = exercise.targetSets
    ? describeTargets(exercise)
    : 'Séance libre — ajoute tes séries'

  return (
    <Card className={done && exercise.status === 'ignore' ? 'opacity-60' : ''}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface2 text-xs font-bold text-muted">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold leading-tight">{exercise.exerciseNameSnapshot}</h3>
          <p className="text-xs text-muted">{targetLine}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          exercise.status === 'termine' ? 'bg-success/15 text-success'
          : exercise.status === 'ignore' ? 'bg-surface2 text-muted'
          : 'bg-accent/15 text-accent'
        }`}>
          {exercise.status === 'termine' ? 'Terminé' : exercise.status === 'ignore' ? 'Ignoré' : `${validated.length}/${exercise.targetSets ?? '∞'}`}
        </span>
      </div>

      {lastPerf && lastPerf.length > 0 ? (
        <p className="mt-2 rounded-lg bg-surface2/50 px-2.5 py-1.5 text-xs text-muted">
          Dernière séance : {lastPerf.length} série{lastPerf.length > 1 ? 's' : ''}
          {' '}{lastPerf.map((s) => `${s.repetitions} reps${s.loadValue > 0 ? ` @ ${s.loadValue} kg` : ''}`).join(' · ')}
        </p>
      ) : null}

      <ol className="mt-3 flex flex-col gap-2">
        {exercise.sets.map((set) => (
          <SetRow
            key={set.id}
            set={set}
            onValidate={() => onValidate({ ...set } as WorkoutSet)}
            onUpdate={onUpdateSet}
            onDelete={onDeleteSet}
          />
        ))}
      </ol>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!done ? (
          <>
            <button onClick={() => onAddSet(exercise.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:border-accent/50 hover:text-ink">
              <Plus size={14} /> Ajouter une série
            </button>
            <button onClick={() => onStatus(exercise.id, 'termine')} className="inline-flex items-center gap-1.5 rounded-xl border border-success/40 px-3 py-2 text-xs font-semibold text-success transition hover:bg-success/10">
              <Flag size={14} /> Terminer l’exercice
            </button>
            <button onClick={() => onStatus(exercise.id, 'ignore')} className="rounded-xl border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:text-ink">
              Ignorer
            </button>
            <button onClick={() => setShowNotes((v) => !v)} className="rounded-xl border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:text-ink">
              Notes
            </button>
            <button onClick={() => onRemove(exercise.id)} className="ml-auto rounded-xl p-2 text-muted transition hover:bg-danger/10 hover:text-danger" aria-label="Retirer l’exercice" title="Retirer (impossible si des séries sont validées)">
              <X size={15} />
            </button>
          </>
        ) : (
          <>
            <button onClick={() => onStatus(exercise.id, 'en_cours')} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:text-ink">
              <RotateCcw size={14} /> Rétablir
            </button>
            <span className="ml-auto text-xs text-muted">{validated.length} série{validated.length > 1 ? 's' : ''} validée{validated.length > 1 ? 's' : ''}</span>
          </>
        )}
      </div>

      {showNotes ? (
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault()
            const form = e.target as HTMLFormElement
            onNotes(exercise.id, (form.elements.namedItem('notes') as HTMLInputElement).value)
            setShowNotes(false)
          }}
        >
          <input
            name="notes"
            defaultValue={exercise.notes ?? ''}
            placeholder="Note technique, sensation…"
            className="w-full rounded-xl border border-line bg-surface2/60 px-3 py-2 text-sm outline-none focus:border-accent"
            maxLength={300}
          />
        </form>
      ) : null}
    </Card>
  )
}

/* ————————————————— Séance en cours ————————————————— */

function LiveSession({ session, onFinished }: { session: WorkoutSession; onFinished: () => void }) {
  const detail = useLiveQuery(() => getSessionDetail(session.id), [session.id])
  const [showFinish, setShowFinish] = useState(false)
  const [confirmAbandon, setConfirmAbandon] = useState(false)
  const [error, setError] = useState('')
  const now = useNow(session.status === 'en_cours')

  const elapsed = session.startedAt ? Math.max(0, Math.floor((now - new Date(session.startedAt).getTime()) / 1000)) : 0

  const validatedCount = detail?.exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.status === 'validee').length, 0) ?? 0
  const totalSets = detail?.exercises.reduce((acc, ex) => acc + ex.sets.length, 0) ?? 0

  async function handleValidate(set: WorkoutSet) {
    setError('')
    try {
      // Le service écrit la série ET lance le minuteur de repos (§7.4)
      await validateSet(set.id, { loadValue: set.loadValue, repetitions: set.repetitions, rir: set.rir })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saisie impossible.')
    }
  }

  async function handleFinish(effort: number | undefined, notes: string) {
    await finishSession(session.id, effort, notes)
    setShowFinish(false)
    onFinished()
  }

  if (!detail) return <PageTitle title="Séance" subtitle="Chargement…" />

  const exercises = detail.exercises.filter((e) => e.status !== 'ignore')
  const ignored = detail.exercises.filter((e) => e.status === 'ignore')

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <PageTitle title={detail.session.name} subtitle={
            session.programDayId ? 'Séance issue d’un programme — cibles copiées au démarrage (§6.3)' : 'Séance libre'
          } />
        </div>
        <div className="mb-5 ml-auto flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface2 px-3 py-1.5 text-xs font-semibold">
            <Clock size={13} /> <span className="numeric">{formatDuration(elapsed)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface2 px-3 py-1.5 text-xs font-semibold">
            <Check size={13} /> <span className="numeric">{validatedCount}</span>&nbsp;séries
          </span>
          {session.status === 'interrompue' ? (
            <button onClick={() => void resumeSession(session.id)} className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-bold text-accent-ink transition hover:brightness-110">
              <Play size={13} /> Reprendre
            </button>
          ) : (
            <button onClick={() => void pauseSession(session.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:text-ink">
              <Pause size={13} /> Interrompre
            </button>
          )}
          <button onClick={() => setShowFinish(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-success px-3 py-2 text-xs font-bold text-white transition hover:brightness-110">
            <Square size={13} /> Terminer
          </button>
        </div>
      </div>

      {session.status === 'interrompue' ? (
        <Card className="mb-4 border-warning/50 bg-warning/10">
          <p className="text-sm"><strong>Séance interrompue.</strong> Reprends quand tu es prêt — les séries validées sont sauvegardées.</p>
        </Card>
      ) : null}
      {error ? <Card className="mb-4 border-danger/50 bg-danger/10 text-sm text-danger">{error}</Card> : null}

      {exercises.length === 0 ? (
        <EmptyState
          icon={<Dumbbell size={28} />}
          title="Aucun exercice dans cette séance"
          message="Ajoute un exercice pour commencer à saisir tes séries."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {exercises.map((ex, i) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              index={i}
              onValidate={handleValidate}
              onUpdateSet={(id, patch) => void updateSet(id, patch).catch((err) => setError(err instanceof Error ? err.message : 'Erreur de saisie.'))}
              onDeleteSet={(id) => void deleteSet(id).catch((err) => setError(err instanceof Error ? err.message : 'Suppression impossible.'))}
              onAddSet={(exId) => void addSet(exId)}
              onStatus={(id, status) => void setExerciseStatus(id, status)}
              onRemove={(id) => void removeExerciseFromSession(id).catch((err) => setError(err instanceof Error ? err.message : 'Impossible de retirer cet exercice.'))}
              onNotes={(id, notes) => void setExerciseNotes(id, notes)}
            />
          ))}
        </div>
      )}

      {ignored.length > 0 ? (
        <p className="mt-4 text-xs text-muted">{ignored.length} exercice{ignored.length > 1 ? 's' : ''} ignoré{ignored.length > 1 ? 's' : ''} — masqué{ignored.length > 1 ? 's' : ''} ({ignored.map((e) => e.exerciseNameSnapshot).join(', ')})</p>
      ) : null}

      {/* Bilan de fin (§7.6) */}
      {showFinish ? (
        <FinishModal
          detail={detail}
          onCancel={() => setShowFinish(false)}
          onFinish={handleFinish}
        />
      ) : null}

      {confirmAbandon ? (
        <Modal title="Abandonner la séance ?" onClose={() => setConfirmAbandon(false)}>
          <p className="text-sm text-muted">
            La séance passera en « annulée ». <strong className="text-ink">Les séries validées sont conservées</strong> dans l’historique.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setConfirmAbandon(false)} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-ink">Continuer la séance</button>
            <button
              onClick={async () => { await abandonSession(session.id); setConfirmAbandon(false); onFinished() }}
              className="rounded-xl bg-danger px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
            >
              Abandonner
            </button>
          </div>
        </Modal>
      ) : null}

      <div className="mt-6">
        <button onClick={() => setConfirmAbandon(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:border-danger/50 hover:text-danger">
          <StopCircle size={16} /> Abandonner la séance
        </button>
      </div>

      <p className="mt-3 text-xs text-muted">
        Séries validées : {validatedCount} / {totalSets} saisies — chaque validation est sauvegardée immédiatement (hors-ligne comprise).
      </p>
    </div>
  )
}

/* ————————————————— Bilan de fin (§7.6) ————————————————— */

function FinishModal({ detail, onCancel, onFinish }: {
  detail: SessionDetail
  onCancel: () => void
  onFinish: (effort: number | undefined, notes: string) => void
}) {
  const endedAt = new Date().toISOString()
  const summary = useMemo(
    () => summarizeSession(
      detail.exercises.map((ex) => ({ name: ex.exerciseNameSnapshot, sets: ex.sets })),
      detail.session.startedAt, endedAt,
    ),
    [detail],
  )
  const [effort, setEffort] = useState<number>(7)
  const [notes, setNotes] = useState('')
  const [confirm, setConfirm] = useState(false)

  return (
    <Modal title="Bilan de fin de séance" onClose={onCancel} wide>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-surface2/50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Durée</p>
          <p className="numeric mt-1 text-xl font-bold">{formatDuration(summary.durationSeconds)}</p>
        </div>
        <div className="rounded-xl bg-surface2/50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Séries validées</p>
          <p className="numeric mt-1 text-xl font-bold">{summary.totalSets}</p>
        </div>
        <div className="rounded-xl bg-surface2/50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Répétitions</p>
          <p className="numeric mt-1 text-xl font-bold">{summary.totalReps}</p>
        </div>
        <div className="rounded-xl bg-surface2/50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Volume</p>
          <p className="numeric mt-1 text-xl font-bold">{summary.volume !== null ? `${summary.volume.toLocaleString('fr-FR')} kg` : '—'}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        {summary.exercises.map((ex) => (
          <div key={ex.name} className="flex items-center justify-between gap-3 rounded-lg bg-surface2/30 px-3 py-2 text-sm">
            <span className="truncate font-medium">{ex.name}</span>
            <span className="shrink-0 text-xs text-muted">
              {ex.workSets} séries · {ex.reps} reps{ex.bestLoad ? ` · max ${ex.bestLoad} kg` : ''}
            </span>
          </div>
        ))}
      </div>

      <label className="mt-5 block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          Effort global (RPE) : {effort}/10 — {effort <= 4 ? 'trop facile' : effort <= 6 ? 'modéré' : effort <= 8 ? 'exigeant' : 'très exigeant'}
        </span>
        <input
          type="range" min={1} max={10} value={effort}
          onChange={(e) => setEffort(Number(e.target.value))}
          className="w-full accent-[var(--color-accent)]"
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Notes (facultatif)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Sensations, douleurs, ce que tu as modifié…"
          className="w-full rounded-xl border border-line bg-surface2/60 px-3 py-2.5 text-sm outline-none focus:border-accent"
          maxLength={500}
        />
      </label>

      {confirm ? (
        <p className="mt-3 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          <AlertTriangle size={14} className="mr-1 inline" />
          Les séries non validées seront retirées. Confirmer ?
        </p>
      ) : null}

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={() => setConfirm(false)} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-ink">
          {confirm ? 'Retour' : 'Continuer la séance'}
        </button>
        <button
          onClick={() => (confirm ? onFinish(effort, notes) : setConfirm(true))}
          className="rounded-xl bg-success px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
        >
          {confirm ? 'Confirmer la fin' : 'Terminer la séance'}
        </button>
      </div>
    </Modal>
  )
}

/* ————————————————— Écran de synthèse post-séance ————————————————— */

function SessionSummaryScreen({ summary, sessionName }: {
  summary: SessionSummary
  sessionName: string
}) {
  return (
    <div>
      <PageTitle title="Séance terminée 🎉" subtitle={sessionName} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-muted">Durée</p><p className="numeric mt-1 text-2xl font-bold">{formatDuration(summary.durationSeconds)}</p></Card>
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-muted">Séries</p><p className="numeric mt-1 text-2xl font-bold">{summary.totalSets}</p></Card>
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-muted">Répétitions</p><p className="numeric mt-1 text-2xl font-bold">{summary.totalReps}</p></Card>
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-muted">Volume</p><p className="numeric mt-1 text-2xl font-bold">{summary.volume !== null ? `${summary.volume.toLocaleString('fr-FR')} kg` : 'Pdc'}</p></Card>
      </div>
      <Card className="mt-4">
        <h2 className="mb-2 font-bold">Détail par exercice</h2>
        <ul className="divide-y divide-line">
          {summary.exercises.map((ex) => (
            <li key={ex.name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="font-medium">{ex.name}</span>
              <span className="text-muted">
                {ex.workSets} × {ex.reps} reps{ex.volume !== null ? ` · ${ex.volume.toLocaleString('fr-FR')} kg` : ''}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link to="/" className="rounded-xl bg-accent px-5 py-3 font-bold text-accent-ink transition hover:brightness-110">Retour à l’accueil</Link>
        <Link to="/progression" className="rounded-xl border border-line px-5 py-3 font-semibold text-muted transition hover:text-ink">Voir ma progression</Link>
      </div>
    </div>
  )
}

/* ————————————————— Ajout d’exercice ————————————————— */

function AddExerciseModal({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState('tous')
  const data = useLiveQuery(async () => ({
    results: await searchExercises(query, muscle === 'tous' ? undefined : muscle),
    groups: await db.muscleGroups.toArray(),
  }), [query, muscle])

  return (
    <Modal title="Ajouter un exercice à la séance" onClose={onClose} wide>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher…"
            className="w-full rounded-xl border border-line bg-surface2/60 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </label>
        <select value={muscle} onChange={(e) => setMuscle(e.target.value)} className="rounded-xl border border-line bg-surface2/60 px-3 py-2.5 text-sm outline-none focus:border-accent">
          <option value="tous">Tous les muscles</option>
          {(data?.groups ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {(data?.results ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Aucun exercice trouvé.</p>
        ) : (
          (data?.results ?? []).map((e) => (
            <button
              key={e.id}
              onClick={async () => {
                const prefs = await getPreferences()
                await addExerciseToSession(sessionId, e.id, {
                  targetSets: 3, minReps: 8, maxReps: 12, restSeconds: prefs.defaultRestSeconds,
                })
                onClose()
              }}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface2/40 px-3 py-2.5 text-left transition hover:border-accent/50"
            >
              <div>
                <p className="text-sm font-semibold">{e.name}</p>
                <p className="mt-0.5 text-xs text-muted">{e.muscleNames.slice(0, 3).join(' · ') || '—'}</p>
              </div>
              <Plus size={16} className="shrink-0 text-accent" />
            </button>
          ))
        )}
      </div>
    </Modal>
  )
}

/* ————————————————— Page ————————————————— */

export default function WorkoutPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const jourParam = searchParams.get('jour')
  const active = useLiveQuery(() => getActiveSession(), [])
  const [justFinished, setJustFinished] = useState<{ name: string; summary: SessionSummary } | null>(null)
  const [addingExercise, setAddingExercise] = useState(false)
  const booted = useRef(false)

  // Démarrage direct depuis un jour de programme (?jour=<id>)
  useEffect(() => {
    if (booted.current) return
    booted.current = true
    if (!jourParam) return
    void (async () => {
      try {
        const day = await db.programDays.get(jourParam)
        if (!day) return
        const program = await db.programs.get(day.programId)
        await startSession({
          programId: day.programId,
          programDayId: day.id,
          name: program ? `${program.name} — ${day.name}` : day.name,
        })
      } catch {
        /* une séance est déjà active : on l'affiche */
      } finally {
        setSearchParams({}, { replace: true })
      }
    })()
  }, [jourParam, setSearchParams])

  let content: JSX.Element
  if (justFinished) {
    content = <SessionSummaryScreen summary={justFinished.summary} sessionName={justFinished.name} />
  } else if (active) {
    content = (
      <>
        <LiveSession session={active} onFinished={() => {
          setJustFinished(null)
          // Rechargé via le live query : la séance passera en terminée
          void getSessionDetail(active.id).then((d) => {
            if (d) {
              const endedAt = d.session.endedAt ?? new Date().toISOString()
              setJustFinished({
                name: d.session.name,
                summary: summarizeSession(
                  d.exercises.map((ex) => ({ name: ex.exerciseNameSnapshot, sets: ex.sets })),
                  d.session.startedAt, endedAt,
                ),
              })
            }
          })
        }} />
        {active.status === 'en_cours' ? (
          <div className="mt-4">
            <button
              onClick={() => setAddingExercise(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-dashed border-accent/50 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent/10"
            >
              <Plus size={16} /> Ajouter un exercice à la séance
            </button>
          </div>
        ) : null}
        {addingExercise ? <AddExerciseModal sessionId={active.id} onClose={() => setAddingExercise(false)} /> : null}
      </>
    )
  } else {
    content = (
        <StartScreen
          onStartDay={async (dayId) => {
            try {
              const day = await db.programDays.get(dayId)
              if (!day) return
              const program = await db.programs.get(day.programId)
              await startSession({
                programId: day.programId, programDayId: day.id,
                name: program ? `${program.name} — ${day.name}` : day.name,
              })
            } catch (err) {
              alert(err instanceof Error ? err.message : 'Impossible de démarrer.')
            }
          }}
          onStartFree={async () => {
            try { await startSession({ name: 'Séance libre' }) } catch (err) { alert(err instanceof Error ? err.message : 'Impossible de démarrer.') }
          }}
        />
      )
  }

  return <div>{content}</div>
}
