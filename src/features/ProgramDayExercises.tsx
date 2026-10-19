import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { Exercise, ProgramExercise } from '../domain/types'
import { programExerciseService, type ProgramExerciseInput, type ProgramExerciseView } from '../services/programExerciseService'
import { getPreferences } from '../services/profileService'

const inputClass = 'min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-blue-100'
const labelClass = 'mb-1 block text-xs font-semibold text-muted'
const baseInput = (exerciseId = ''): ProgramExerciseInput => ({ exerciseId, targetSets: 3, minReps: 8, maxReps: 12, targetLoad: undefined, targetLoadUnit: 'kg', restSeconds: 90, notes: '' })

function PrescriptionForm({ exercises, initial, unitSystem, busy, onCancel, onSave }: {
  exercises: Exercise[]
  initial?: ProgramExercise
  unitSystem: 'kg' | 'lb'
  busy: boolean
  onCancel: () => void
  onSave: (input: ProgramExerciseInput) => Promise<void>
}) {
  const [values, setValues] = useState<ProgramExerciseInput>(initial ? { ...initial } : baseInput())
  const [loadText, setLoadText] = useState(initial?.targetLoad === undefined ? '' : String(initial.targetLoad))
  const [loadUnit, setLoadUnit] = useState<'kg' | 'lb'>(initial?.targetLoadUnit ?? unitSystem)
  const [error, setError] = useState('')
  const update = <K extends keyof ProgramExerciseInput>(key: K, value: ProgramExerciseInput[K]) => setValues(current => ({ ...current, [key]: value }))
  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    const targetLoad = loadText.trim() === '' ? undefined : Number(loadText)
    const input = { ...values, targetLoad, targetLoadUnit: loadUnit }
    try { await onSave(input) } catch (e) { setError(e instanceof Error ? e.message : 'La prescription n’a pas pu être enregistrée.') }
  }
  return <form onSubmit={submit} noValidate className="space-y-3 rounded-2xl border border-line bg-surface2/50 p-3 sm:p-4">
    <div><label htmlFor="scheduled-exercise" className={labelClass}>Exercice</label><select id="scheduled-exercise" className={inputClass} value={values.exerciseId} onChange={event => update('exerciseId', event.target.value)} required><option value="">Choisir dans la bibliothèque…</option>{exercises.map(exercise => <option key={exercise.id} value={exercise.id}>{exercise.name} · {exercise.equipment.replaceAll('_', ' ')}</option>)}</select></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <label><span className={labelClass}>Séries (1–20)</span><input aria-label="Nombre de séries" className={inputClass} type="number" min="1" max="20" step="1" value={values.targetSets} onChange={event => update('targetSets', Number(event.target.value))} /></label>
      <label><span className={labelClass}>Répétitions min.</span><input aria-label="Répétitions minimum" className={inputClass} type="number" min="1" max="100" step="1" value={values.minReps} onChange={event => update('minReps', Number(event.target.value))} /></label>
      <label><span className={labelClass}>Répétitions max.</span><input aria-label="Répétitions maximum" className={inputClass} type="number" min="1" max="100" step="1" value={values.maxReps} onChange={event => update('maxReps', Number(event.target.value))} /></label>
      <div><span className={labelClass}>Charge cible (facultative)</span><div className="grid grid-cols-[minmax(0,1fr)_68px] gap-1"><input aria-label={`Charge cible en ${loadUnit}`} className={inputClass} type="number" min="0" max="1000" step="0.5" inputMode="decimal" value={loadText} onChange={event => setLoadText(event.target.value)} placeholder="—" /><select aria-label="Unité de la charge cible" className={inputClass} value={loadUnit} onChange={event => setLoadUnit(event.target.value as 'kg' | 'lb')}><option value="kg">kg</option><option value="lb">lb</option></select></div></div>
    </div>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,180px)_1fr]">
      <label><span className={labelClass}>Repos (secondes)</span><input aria-label="Repos en secondes" className={inputClass} type="number" min="0" max="3600" step="5" value={values.restSeconds} onChange={event => update('restSeconds', Number(event.target.value))} /></label>
      <label><span className={labelClass}>Note facultative</span><input aria-label="Note sur l’exercice" className={inputClass} maxLength={500} value={values.notes ?? ''} onChange={event => update('notes', event.target.value)} placeholder="Consigne ou variante" /></label>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-sm text-red-800">{error}</p>}
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={busy} onClick={onCancel} className="min-h-11 rounded-xl border border-line px-4 text-sm font-semibold text-ink">Annuler</button><button type="submit" disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"><Check size={16} />{busy ? 'Enregistrement…' : initial ? 'Enregistrer' : 'Ajouter l’exercice'}</button></div>
  </form>
}

export function ProgramDayExercises({ dayId, disabled, onChanged }: { dayId: string; disabled: boolean; onChanged?: () => void }) {
  const [rows, setRows] = useState<ProgramExerciseView[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [unitSystem, setUnitSystem] = useState<'kg' | 'lb'>('kg')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<ProgramExercise | undefined>()
  const [adding, setAdding] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [dayRows, library, preferences] = await Promise.all([programExerciseService.listForDay(dayId), programExerciseService.listLibraryExercises(), getPreferences()])
      setRows(dayRows)
      setExercises(library)
      setUnitSystem(preferences.unitSystem)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Les exercices ne sont pas disponibles.') }
    finally { setLoading(false) }
  }, [dayId])
  useEffect(() => { void reload() }, [reload])

  async function save(input: ProgramExerciseInput) {
    setBusy(true); setError(''); setNotice('')
    try {
      if (editing) await programExerciseService.update(editing.id, input)
      else await programExerciseService.add(dayId, input)
      setEditing(undefined); setAdding(false); setNotice(editing ? 'Prescription modifiée.' : 'Exercice ajouté.')
      await reload(); onChanged?.()
    } catch (cause) { throw cause }
    finally { setBusy(false) }
  }

  async function move(row: ProgramExerciseView, direction: -1 | 1) {
    setBusy(true); setError(''); setNotice('')
    try { await programExerciseService.move(row.id, direction); await reload(); setNotice('Ordre mis à jour.'); onChanged?.() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible de réorganiser cet exercice.') }
    finally { setBusy(false) }
  }

  async function remove(row: ProgramExerciseView) {
    setBusy(true); setError(''); setNotice('')
    try { await programExerciseService.remove(row.id); setConfirmRemove(null); await reload(); setNotice('Exercice retiré du programme.'); onChanged?.() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible de retirer cet exercice.') }
    finally { setBusy(false) }
  }

  return <div className="mt-4 space-y-3 border-t border-line pt-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-semibold text-ink">Exercices planifiés</h4><p className="text-xs text-muted">Séries, répétitions, charge cible et repos pour cette journée.</p></div><button disabled={disabled || busy || loading || adding || !!editing} onClick={() => { setAdding(true); setNotice('') }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink disabled:opacity-40"><Plus size={16} /> Ajouter</button></div>
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-2.5 text-sm text-emerald-800">{notice}</p>}
    {error && <div role="alert" className="rounded-lg bg-red-50 p-2.5 text-sm text-red-800">{error}<button onClick={() => void reload()} className="ml-2 font-semibold underline">Réessayer</button></div>}
    {loading ? <p role="status" className="py-3 text-sm text-muted">Chargement des exercices…</p> : rows.length === 0 && !adding ? <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">Aucun exercice planifié. Ajoute-en un depuis la bibliothèque.</p> : <ol className="space-y-2">{rows.map((row, index) => <li key={row.id} className="rounded-xl border border-line bg-surface p-3">
      {editing?.id === row.id ? <PrescriptionForm exercises={exercises} initial={row} unitSystem={unitSystem} busy={busy} onCancel={() => setEditing(undefined)} onSave={save} /> : <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1"><p className="font-semibold text-ink">{index + 1}. {row.exercise.name}</p><p className="mt-1 text-sm text-muted">{row.targetSets} × {row.minReps}–{row.maxReps}{row.targetLoad !== undefined ? ` · ${row.targetLoad} ${row.targetLoadUnit ?? unitSystem}` : ''} · repos {row.restSeconds} s</p>{row.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{row.notes}</p>}</div>
        <div className="flex flex-wrap gap-1 sm:justify-end"><button disabled={disabled || busy || index === 0} aria-label={`Monter ${row.exercise.name}`} onClick={() => void move(row, -1)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-line text-muted disabled:opacity-30"><ArrowUp size={17} /></button><button disabled={disabled || busy || index === rows.length - 1} aria-label={`Descendre ${row.exercise.name}`} onClick={() => void move(row, 1)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-line text-muted disabled:opacity-30"><ArrowDown size={17} /></button><button disabled={disabled || busy || adding || !!editing} aria-label={`Modifier ${row.exercise.name}`} onClick={() => setEditing(row)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-line text-muted disabled:opacity-30"><Pencil size={16} /></button><button disabled={disabled || busy} aria-label={`Retirer ${row.exercise.name}`} onClick={() => setConfirmRemove(row.id)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-red-200 text-red-700 disabled:opacity-30"><Trash2 size={16} /></button></div>
        {confirmRemove === row.id && <div className="flex items-center gap-2 border-t border-line pt-2 text-sm sm:ml-auto"><span>Retirer cet exercice ?</span><button disabled={busy} onClick={() => void remove(row)} className="min-h-10 rounded-lg bg-red-600 px-3 font-semibold text-white">Confirmer</button><button disabled={busy} onClick={() => setConfirmRemove(null)} aria-label="Annuler le retrait" className="flex h-10 w-10 items-center justify-center rounded-lg border border-line"><X size={16} /></button></div>}
      </div>}
    </li>)}</ol>}
    {adding && <PrescriptionForm exercises={exercises.filter(exercise => !rows.some(row => row.exerciseId === exercise.id))} unitSystem={unitSystem} busy={busy} onCancel={() => setAdding(false)} onSave={save} />}
  </div>
}
