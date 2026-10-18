import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, ArrowDown, ArrowUp, CalendarDays, Check, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import {
  addExerciseToDay, createDay, deleteDay, deleteProgramExercise, getProgramDetail,
  moveDay, moveProgramExercise, searchExercises, setProgramStatus, updateDay,
  updateProgramExercise,
} from '../services/programService'
import { db } from '../services/db'
import { Card, EmptyState, PageTitle } from '../components/ui'
import Modal from '../components/Modal'
import {
  describeTargets, validateProgramDayInput,
  validateProgramExerciseInput, WEEKDAY_LABELS,
} from '../domain/programs'
import type { Exercise, ProgramDay, ProgramExercise, ProgramStatus } from '../domain/types'

const inputCls = 'w-full rounded-xl border border-line bg-surface2/60 px-3 py-2.5 text-sm outline-none focus:border-accent'
const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-muted'

/** Formulaire de cibles (séries × reps, charge, repos) — §6.1. */
function TargetsForm({ initial, onSubmit, onCancel, submitLabel }: {
  initial: { targetSets: number; minReps: number; maxReps: number; targetLoad?: number; restSeconds: number; notes?: string }
  onSubmit: (v: { targetSets: number; minReps: number; maxReps: number; targetLoad?: number; restSeconds: number; notes?: string }) => void
  onCancel: () => void
  submitLabel: string
}) {
  const [targetSets, setTargetSets] = useState(String(initial.targetSets))
  const [minReps, setMinReps] = useState(String(initial.minReps))
  const [maxReps, setMaxReps] = useState(String(initial.maxReps))
  const [targetLoad, setTargetLoad] = useState(initial.targetLoad !== undefined ? String(initial.targetLoad) : '')
  const [restSeconds, setRestSeconds] = useState(String(initial.restSeconds))
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [error, setError] = useState('')

  function onSubmitForm(e: FormEvent) {
    e.preventDefault()
    setError('')
    const v = validateProgramExerciseInput({
      targetSets: Number(targetSets), minReps: Number(minReps), maxReps: Number(maxReps),
      targetLoad: targetLoad.trim() === '' ? undefined : Number(targetLoad),
      restSeconds: Number(restSeconds),
    })
    if (!v.ok) { setError(v.errors[0]); return }
    onSubmit({
      targetSets: Number(targetSets), minReps: Number(minReps), maxReps: Number(maxReps),
      targetLoad: targetLoad.trim() === '' ? undefined : Number(targetLoad),
      restSeconds: Number(restSeconds), notes: notes.trim() || undefined,
    })
  }

  return (
    <form onSubmit={onSubmitForm} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className={labelCls}>Séries cibles</span>
          <input type="number" min={1} max={20} value={targetSets} onChange={(e) => setTargetSets(e.target.value)} className={inputCls} inputMode="numeric" required />
        </label>
        <label>
          <span className={labelCls}>Repos (secondes)</span>
          <input type="number" min={0} max={3600} step={5} value={restSeconds} onChange={(e) => setRestSeconds(e.target.value)} className={inputCls} inputMode="numeric" required />
        </label>
        <label>
          <span className={labelCls}>Répétitions min</span>
          <input type="number" min={0} max={200} value={minReps} onChange={(e) => setMinReps(e.target.value)} className={inputCls} inputMode="numeric" required />
        </label>
        <label>
          <span className={labelCls}>Répétitions max</span>
          <input type="number" min={0} max={200} value={maxReps} onChange={(e) => setMaxReps(e.target.value)} className={inputCls} inputMode="numeric" required />
        </label>
        <label className="col-span-2">
          <span className={labelCls}>Charge cible (kg, facultatif — 0 = poids du corps)</span>
          <input type="number" min={0} max={1000} step={0.5} value={targetLoad} onChange={(e) => setTargetLoad(e.target.value)} placeholder="Ex. 60" className={inputCls} inputMode="decimal" />
        </label>
      </div>
      <label>
        <span className={labelCls}>Notes (facultatif)</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex. tempo 3-1-1, prise serrée…" className={inputCls} maxLength={200} />
      </label>
      {error ? <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-ink">Annuler</button>
        <button type="submit" className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-ink transition hover:brightness-110">{submitLabel}</button>
      </div>
    </form>
  )
}

/** Sélecteur d’exercices depuis la bibliothèque (§5). */
function ExercisePicker({ onPick }: { onPick: (e: Exercise) => void }) {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState('tous')
  const [equipment, setEquipment] = useState('tous')
  const data = useLiveQuery(async () => ({
    results: await searchExercises(query, muscle === 'tous' ? undefined : muscle, equipment === 'tous' ? undefined : equipment),
    groups: await db.muscleGroups.toArray(),
  }), [query, muscle, equipment])

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un exercice…"
            className="w-full rounded-xl border border-line bg-surface2/60 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </label>
        <select value={muscle} onChange={(e) => setMuscle(e.target.value)} className={inputCls}>
          <option value="tous">Tous les muscles</option>
          {(data?.groups ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={equipment} onChange={(e) => setEquipment(e.target.value)} className={inputCls}>
          <option value="tous">Tout matériel</option>
          <option value="barre">Barre</option>
          <option value="halteres">Haltères</option>
          <option value="machine">Machine</option>
          <option value="poulie">Poulie</option>
          <option value="poids_du_corps">Poids du corps</option>
        </select>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {(data?.results ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Aucun exercice ne correspond. Crée-le dans l’onglet Exercices.</p>
        ) : (
          (data?.results ?? []).map((e) => (
            <button
              key={e.id}
              onClick={() => onPick(e)}
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
    </div>
  )
}

export default function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const detail = useLiveQuery(() => (id ? getProgramDetail(id) : null), [id])

  const [dayForm, setDayForm] = useState<{ open: boolean; editing?: ProgramDay }>({ open: false })
  const [dayError, setDayError] = useState('')
  const [pickerDayId, setPickerDayId] = useState<string | null>(null)
  const [targetsForm, setTargetsForm] = useState<{ dayId: string; editing?: ProgramExercise & { exerciseName: string }; exercise?: Exercise } | null>(null)
  const [confirmDeleteDay, setConfirmDeleteDay] = useState<ProgramDay | null>(null)
  const [confirmDeletePE, setConfirmDeletePE] = useState<ProgramExercise | null>(null)
  const [busy, setBusy] = useState(false)

  const program = detail?.program
  const days = useMemo(() => detail?.days ?? [], [detail])

  if (detail === undefined) {
    return <PageTitle title="Programme" subtitle="Chargement…" />
  }
  if (!detail) {
    return <PageTitle title="Programme introuvable" subtitle="Ce programme n’existe plus ou a été supprimé." />
  }

  async function onCreateDay(e: FormEvent) {
    e.preventDefault()
    if (!program) return
    setDayError('')
    const form = e.target as HTMLFormElement
    const input = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      scheduledWeekday: (form.elements.namedItem('scheduledWeekday') as HTMLSelectElement).value === ''
        ? undefined : Number((form.elements.namedItem('scheduledWeekday') as HTMLSelectElement).value),
      notes: (form.elements.namedItem('notes') as HTMLInputElement).value,
    }
    const v = validateProgramDayInput(input)
    if (!v.ok) { setDayError(v.errors[0]); return }
    await createDay(program.id, input)
    setDayForm({ open: false })
  }

  async function onSaveDay(e: FormEvent) {
    e.preventDefault()
    if (!dayForm.editing) return
    setDayError('')
    const form = e.target as HTMLFormElement
    const patch = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      scheduledWeekday: (form.elements.namedItem('scheduledWeekday') as HTMLSelectElement).value === ''
        ? undefined : Number((form.elements.namedItem('scheduledWeekday') as HTMLSelectElement).value),
      notes: (form.elements.namedItem('notes') as HTMLInputElement).value,
    }
    const v = validateProgramDayInput(patch)
    if (!v.ok) { setDayError(v.errors[0]); return }
    await updateDay(dayForm.editing.id, patch)
    setDayForm({ open: false })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => navigate('/programme')} className="rounded-xl border border-line p-2 text-muted transition hover:text-ink" aria-label="Retour aux programmes">
          <ArrowLeft size={18} />
        </button>
        <PageTitle title={program?.name ?? 'Programme'} subtitle={program?.objective || 'Détails du programme'} />
        <select
          value={program?.status ?? 'actif'}
          onChange={(e) => program && setProgramStatus(program.id, e.target.value as ProgramStatus)}
          className="mb-5 ml-auto rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          aria-label="Statut du programme"
        >
          <option value="actif">Actif</option>
          <option value="pause">En pause</option>
          <option value="archive">Archivé</option>
        </select>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Jours d’entraînement</h2>
        <button
          onClick={() => setDayForm({ open: true })}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-ink transition hover:brightness-110"
        >
          <Plus size={15} /> Ajouter un jour
        </button>
      </div>

      {days.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={28} />}
          title="Aucun jour pour l’instant"
          message="Un programme se compose de jours (ex. « Pectoraux / Triceps », « Dos / Biceps »). Ajoute un jour, puis des exercices avec tes cibles."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {days.map((day, i) => (
            <Card key={day.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface2 text-sm font-bold text-muted">{i + 1}</span>
                <div className="min-w-0">
                  <h3 className="font-bold">{day.name}</h3>
                  <p className="text-xs text-muted">
                    {day.scheduledWeekday ? `${WEEKDAY_LABELS[day.scheduledWeekday - 1]} · ` : ''}
                    {day.exercises.length} exercice{day.exercises.length > 1 ? 's' : ''}
                    {day.exercises.length > 0 ? ` — ${day.exercises.reduce((acc, ex) => acc + ex.targetSets, 0)} séries au total` : ''}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <button onClick={() => moveDay(day.id, -1)} disabled={i === 0} className="rounded-lg p-1.5 text-muted transition enabled:hover:bg-surface2 enabled:hover:text-ink disabled:opacity-30" aria-label="Monter"><ArrowUp size={16} /></button>
                  <button onClick={() => moveDay(day.id, 1)} disabled={i === days.length - 1} className="rounded-lg p-1.5 text-muted transition enabled:hover:bg-surface2 enabled:hover:text-ink disabled:opacity-30" aria-label="Descendre"><ArrowDown size={16} /></button>
                  <button onClick={() => setDayForm({ open: true, editing: day })} className="rounded-lg p-1.5 text-muted transition hover:bg-surface2 hover:text-ink" aria-label="Modifier le jour"><Pencil size={16} /></button>
                  <button onClick={() => setConfirmDeleteDay(day)} className="rounded-lg p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger" aria-label="Supprimer le jour"><Trash2 size={16} /></button>
                </div>
              </div>
              {day.notes ? <p className="mt-2 text-sm text-muted">{day.notes}</p> : null}

              {/* Exercices planifiés du jour */}
              {day.exercises.length > 0 ? (
                <ol className="mt-3 flex flex-col gap-2">
                  {day.exercises.map((pe, j) => (
                    <li key={pe.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface2/40 px-3 py-2.5">
                      <span className="w-6 shrink-0 text-center text-xs font-bold text-muted">{j + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{pe.exercise?.name ?? 'Exercice supprimé'}</p>
                        <p className="text-xs text-muted">{describeTargets(pe)}</p>
                      </div>
                      {pe.notes ? <p className="hidden max-w-40 truncate text-xs text-muted sm:block" title={pe.notes}>{pe.notes}</p> : null}
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveProgramExercise(pe.id, -1)} disabled={j === 0} className="rounded-lg p-1.5 text-muted transition enabled:hover:bg-surface enabled:hover:text-ink disabled:opacity-30" aria-label="Monter"><ArrowUp size={15} /></button>
                        <button onClick={() => moveProgramExercise(pe.id, 1)} disabled={j === day.exercises.length - 1} className="rounded-lg p-1.5 text-muted transition enabled:hover:bg-surface enabled:hover:text-ink disabled:opacity-30" aria-label="Descendre"><ArrowDown size={15} /></button>
                        <button onClick={() => setTargetsForm({ dayId: day.id, editing: { ...pe, exerciseName: pe.exercise?.name ?? 'Exercice' } })} className="rounded-lg p-1.5 text-muted transition hover:bg-surface2 hover:text-ink" aria-label="Modifier les cibles"><Pencil size={15} /></button>
                        <button onClick={() => setConfirmDeletePE(pe)} className="rounded-lg p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger" aria-label="Retirer l’exercice"><Trash2 size={15} /></button>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-line px-3 py-3 text-center text-xs text-muted">Aucun exercice planifié — ajoute-en un.</p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setPickerDayId(day.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-bold text-accent transition hover:bg-accent/20"
                >
                  <Plus size={14} /> Ajouter un exercice
                </button>
                <Link
                  to={`/seance?jour=${day.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-bold text-accent-ink transition hover:brightness-110"
                >
                  <Check size={14} /> Démarrer ce jour
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Création / édition de jour */}
      {dayForm.open ? (
        <Modal title={dayForm.editing ? 'Modifier le jour' : 'Nouveau jour'} onClose={() => setDayForm({ open: false })}>
          <form onSubmit={dayForm.editing ? onSaveDay : onCreateDay} className="flex flex-col gap-4">
            <label>
              <span className={labelCls}>Nom du jour</span>
              <input
                autoFocus
                name="name"
                defaultValue={dayForm.editing?.name ?? ''}
                placeholder="Ex. Pectoraux / Triceps"
                className={inputCls}
                maxLength={60}
                required
              />
            </label>
            <label>
              <span className={labelCls}>Jour de la semaine (facultatif)</span>
              <select name="scheduledWeekday" defaultValue={dayForm.editing?.scheduledWeekday ?? ''} className={inputCls}>
                <option value="">Non planifié</option>
                {WEEKDAY_LABELS.map((label, i) => <option key={label} value={i + 1}>{label}</option>)}
              </select>
            </label>
            <label>
              <span className={labelCls}>Notes (facultatif)</span>
              <input name="notes" defaultValue={dayForm.editing?.notes ?? ''} placeholder="Ex. échauffement 10 min vélo" className={inputCls} maxLength={200} />
            </label>
            {dayError ? <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{dayError}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDayForm({ open: false })} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-ink">Annuler</button>
              <button type="submit" className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-ink transition hover:brightness-110">
                {dayForm.editing ? 'Enregistrer' : 'Ajouter le jour'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {/* Sélecteur d’exercices */}
      {pickerDayId ? (
        <Modal title="Ajouter un exercice au jour" onClose={() => setPickerDayId(null)} wide>
          <ExercisePicker
            onPick={(exercise) => {
              const dayId = pickerDayId
              setPickerDayId(null)
              if (dayId) setTargetsForm({ dayId, exercise })
            }}
          />
        </Modal>
      ) : null}

      {/* Cibles d’un exercice (ajout ou édition) */}
      {targetsForm ? (
        <Modal
          title={targetsForm.editing ? `Cibles — ${targetsForm.editing.exerciseName}` : `Cibles — ${targetsForm.exercise?.name ?? 'Exercice'}`}
          onClose={() => setTargetsForm(null)}
        >
          <TargetsForm
            initial={
              targetsForm.editing
                ? { targetSets: targetsForm.editing.targetSets, minReps: targetsForm.editing.minReps, maxReps: targetsForm.editing.maxReps, targetLoad: targetsForm.editing.targetLoad, restSeconds: targetsForm.editing.restSeconds, notes: targetsForm.editing.notes }
                : { targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 }
            }
            submitLabel={targetsForm.editing ? 'Enregistrer' : 'Ajouter au jour'}
            onCancel={() => setTargetsForm(null)}
            onSubmit={async (v) => {
              if (!targetsForm) return
              if (targetsForm.editing) {
                await updateProgramExercise(targetsForm.editing.id, v)
              } else if (targetsForm.exercise) {
                await addExerciseToDay(targetsForm.dayId, targetsForm.exercise.id, v)
              }
              setTargetsForm(null)
            }}
          />
        </Modal>
      ) : null}

      {/* Confirmations */}
      {confirmDeleteDay ? (
        <Modal title="Supprimer ce jour ?" onClose={() => setConfirmDeleteDay(null)}>
          <p className="text-sm text-muted">
            Le jour « {confirmDeleteDay.name} » et ses exercices planifiés seront supprimés.
            <strong className="text-ink"> Les séances déjà réalisées ne sont pas affectées</strong> (§17.2).
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setConfirmDeleteDay(null)} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-ink">Annuler</button>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                await deleteDay(confirmDeleteDay.id)
                setConfirmDeleteDay(null)
                setBusy(false)
              }}
              className="rounded-xl bg-danger px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? 'Suppression…' : 'Supprimer le jour'}
            </button>
          </div>
        </Modal>
      ) : null}

      {confirmDeletePE ? (
        <Modal title="Retirer cet exercice du jour ?" onClose={() => setConfirmDeletePE(null)}>
          <p className="text-sm text-muted">
            L’exercice sera retiré de la planification. Les séances passées restent intactes.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setConfirmDeletePE(null)} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-ink">Annuler</button>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                await deleteProgramExercise(confirmDeletePE.id)
                setConfirmDeletePE(null)
                setBusy(false)
              }}
              className="rounded-xl bg-danger px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? 'Retrait…' : 'Retirer'}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
