import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Check, CirclePause, Clock3, Dumbbell, HeartPulse, Play, Plus, RefreshCw, SkipForward, Square, TimerReset, X } from 'lucide-react'
import type { Exercise, WorkoutSet } from '../domain/types'
import { Card, EmptyState, PageTitle } from '../components/ui'
import { db } from '../services/db'
import { getPreferences } from '../services/profileService'
import { workoutService, type WorkoutDetail, type WorkoutExerciseDetail } from '../services/workoutService'

const timerKey = (sessionId: string) => `gym-os:rest-until:${sessionId}`
function readTimerExpiry(sessionId: string): number | undefined {
  try { const value = Number(window.localStorage.getItem(timerKey(sessionId))); return value > Date.now() ? value : undefined }
  catch { return undefined }
}
function writeTimerExpiry(sessionId: string, value?: number) {
  try { if (value) window.localStorage.setItem(timerKey(sessionId), String(value)); else window.localStorage.removeItem(timerKey(sessionId)) }
  catch { /* The visible countdown still works for this page even if storage is denied. */ }
}
const fieldClass = 'min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base font-semibold text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-blue-100'

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60)
  const seconds = Math.max(0, totalSeconds) % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatElapsed(startedAt?: string, now = Date.now()) {
  if (!startedAt) return '00:00'
  return formatClock(Math.floor((now - new Date(startedAt).getTime()) / 1000))
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : 'Une erreur est survenue. Réessaie.'
}

export default function WorkoutPage() {
  const [searchParams] = useSearchParams()
  const [detail, setDetail] = useState<WorkoutDetail>()
  const [days, setDays] = useState<Awaited<ReturnType<typeof workoutService.listProgramDays>>>([])
  const [chosenDay, setChosenDay] = useState(searchParams.get('day') ?? '')
  const [chosenExercise, setChosenExercise] = useState('')
  const [currentExerciseId, setCurrentExerciseId] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [timerEnd, setTimerEnd] = useState<number>()
  const [clockNow, setClockNow] = useState(Date.now())
  const [elapsed, setElapsed] = useState(Date.now())
  const [showFinish, setShowFinish] = useState(false)
  const [effort, setEffort] = useState('')
  const [notes, setNotes] = useState('')
  const [libraryOptions, setLibraryOptions] = useState<Exercise[]>([])
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({})

  const refreshDetail = useCallback(async (sessionId: string) => {
    const refreshed = await workoutService.getSession(sessionId)
    if (refreshed) setDetail(refreshed)
    return refreshed
  }, [])

  useEffect(() => {
    let active = true
    void Promise.all([workoutService.getActiveSession(), workoutService.listProgramDays()])
      .then(([activeSession, availableDays]) => {
        if (!active) return
        setDetail(activeSession)
        setDays(availableDays)
        if (activeSession) setNotes(activeSession.session.notes ?? '')
      })
      .catch(cause => { if (active) setError(messageOf(cause)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!detail) return
    let active = true
    void db.exercises.toArray().then(rows => {
      if (active) setLibraryOptions(rows.filter(exercise => !detail.exercises.some(row => row.exerciseId === exercise.id)).sort((a, b) => a.name.localeCompare(b.name, 'fr')))
    })
    return () => { active = false }
  }, [detail])

  useEffect(() => {
    if (!detail) return
    const stored = readTimerExpiry(detail.session.id)
    setTimerEnd(stored)
    if (!stored) writeTimerExpiry(detail.session.id)
  }, [detail?.session.id])

  useEffect(() => {
    if (!detail) return
    const interval = window.setInterval(() => {
      setElapsed(Date.now())
      setClockNow(Date.now())
    }, 1000)
    return () => window.clearInterval(interval)
  }, [detail?.session.id])

  useEffect(() => {
    if (!detail) return
    writeTimerExpiry(detail.session.id, timerEnd)
  }, [detail?.session.id, timerEnd])

  useEffect(() => {
    if (timerEnd && timerEnd <= clockNow) setTimerEnd(undefined)
  }, [clockNow, timerEnd])

  const currentExercise = useMemo(() => {
    if (!detail?.exercises.length) return undefined
    return detail.exercises.find(exercise => exercise.id === currentExerciseId) ?? detail.exercises[0]
  }, [currentExerciseId, detail])

  async function startFromChosenDay() {
    if (!chosenDay) { setError('Choisis une journée de programme ou démarre une séance libre.'); return }
    setBusy(true); setError(''); setSuccess('')
    try {
      const started = await workoutService.startFromDay(chosenDay)
      setDetail(started); setCurrentExerciseId(started.exercises[0]?.id); setNotes('')
    } catch (cause) { setError(messageOf(cause)) }
    finally { setBusy(false) }
  }

  async function startFree() {
    setBusy(true); setError(''); setSuccess('')
    try { const started = await workoutService.startFree(); setDetail(started); setNotes('') }
    catch (cause) { setError(messageOf(cause)) }
    finally { setBusy(false) }
  }

  async function resumeSession() {
    if (!detail) return
    setBusy(true); setError('')
    try { setDetail(await workoutService.resume(detail.session.id)) }
    catch (cause) { setError(messageOf(cause)) }
    finally { setBusy(false) }
  }

  async function addExercise() {
    if (!detail || !chosenExercise) return
    setBusy(true); setError('')
    try {
      const row = await workoutService.addExercise(detail.session.id, chosenExercise)
      setChosenExercise(''); setCurrentExerciseId(row.id)
      await refreshDetail(detail.session.id)
    } catch (cause) { setError(messageOf(cause)) }
    finally { setBusy(false) }
  }

  function updateLocalSet(row: WorkoutExerciseDetail, set: WorkoutSet, patch: Partial<WorkoutSet>) {
    const next = { ...set, ...patch }
    setDetail(current => current ? ({
      ...current,
      exercises: current.exercises.map(exercise => exercise.id === row.id
        ? { ...exercise, sets: exercise.sets.map(item => item.id === set.id ? next : item) }
        : exercise),
    }) : current)
    setDraftErrors(current => ({ ...current, [set.id]: '' }))
    void workoutService.updateSetDraft(set.id, {
      loadValue: next.loadValue, loadUnit: next.loadUnit, repetitions: next.repetitions, rir: next.rir,
    }).catch(cause => setDraftErrors(current => ({ ...current, [set.id]: messageOf(cause) })))
  }

  async function completeSet(set: WorkoutSet) {
    setBusy(true); setError('')
    try {
      await workoutService.completeSet(set.id)
      await refreshDetail(detail!.session.id)
      const seconds = currentExercise?.restSecondsSnapshot ?? (await getPreferences()).defaultRestSeconds
      if (seconds > 0) setTimerEnd(Date.now() + seconds * 1000)
    } catch (cause) { setError(messageOf(cause)) }
    finally { setBusy(false) }
  }

  async function skipSet(set: WorkoutSet) {
    setBusy(true); setError('')
    try { await workoutService.skipSet(set.id); await refreshDetail(detail!.session.id) }
    catch (cause) { setError(messageOf(cause)) }
    finally { setBusy(false) }
  }

  async function addSet(type: WorkoutSet['setType'] = 'travail') {
    if (!currentExercise) return
    setBusy(true); setError('')
    try { await workoutService.addSet(currentExercise.id, type); await refreshDetail(detail!.session.id) }
    catch (cause) { setError(messageOf(cause)) }
    finally { setBusy(false) }
  }

  async function pauseSession() {
    if (!detail) return
    setBusy(true); setError('')
    try { await workoutService.interrupt(detail.session.id); setDetail(await workoutService.getActiveSession()); setTimerEnd(undefined) }
    catch (cause) { setError(messageOf(cause)) }
    finally { setBusy(false) }
  }

  async function cancelSession() {
    if (!detail) return
    setBusy(true); setError('')
    try { await workoutService.cancel(detail.session.id); writeTimerExpiry(detail.session.id); setDetail(undefined); setSuccess('Séance annulée. Les séries validées restent conservées dans les données locales.') }
    catch (cause) { setError(messageOf(cause)) }
    finally { setBusy(false) }
  }

  async function finishSession() {
    if (!detail) return
    setBusy(true); setError('')
    try {
      const finished = await workoutService.finish(detail.session.id, { overallEffort: effort ? Number(effort) : undefined, notes })
      writeTimerExpiry(detail.session.id); setTimerEnd(undefined); setShowFinish(false); setDetail(undefined)
      setSuccess(`Séance terminée — ${new Date(finished.endedAt ?? Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}. Tes performances sont enregistrées.`)
    } catch (cause) { setError(messageOf(cause)) }
    finally { setBusy(false) }
  }

  if (loading) return <div><PageTitle title="Séance en direct" subtitle="Chargement de tes données…" /><Card><p role="status" className="flex items-center gap-2 py-5 text-sm text-muted"><RefreshCw className="animate-spin" size={18} /> Préparation de la séance…</p></Card></div>

  if (!detail) return <div className="space-y-5">
    <PageTitle title="Séance en direct" subtitle="Démarre depuis un jour de programme ou lance une séance libre. Chaque série validée est sauvegardée sur cet appareil." />
    {success && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{success}</div>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {days.length ? <Card><label htmlFor="workout-day" className="mb-2 block text-sm font-semibold text-ink">Choisir une journée de programme</label><select id="workout-day" value={chosenDay} onChange={event => setChosenDay(event.target.value)} className={fieldClass}><option value="">Choisir…</option>{days.map(({ program, day, exerciseCount }) => <option key={day.id} value={day.id}>{program.name} — {day.name} ({exerciseCount} {exerciseCount === 1 ? 'exercice' : 'exercices'})</option>)}</select><button disabled={busy || !chosenDay} onClick={() => void startFromChosenDay()} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 font-bold text-white disabled:opacity-50"><Play size={18} />{busy ? 'Démarrage…' : 'Démarrer cette séance'}</button></Card> : <EmptyState icon={<Dumbbell size={28} />} title="Aucune journée prête à démarrer" message="Crée un programme actif et ajoute des exercices à une journée, ou démarre une séance libre." action={{ label: 'Configurer mes programmes', to: '/programme' }} />}
    <Link to="/recuperation" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-accent hover:underline"><HeartPulse size={17} /> Faire un bilan de récupération facultatif avant la séance</Link>
    <Card><h2 className="font-bold text-ink">Séance libre</h2><p className="mt-1 text-sm text-muted">Ajoute les exercices au fur et à mesure. Les données sont sauvegardées localement.</p><button disabled={busy} onClick={() => void startFree()} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface2 px-4 font-semibold text-ink disabled:opacity-50"><Plus size={18} /> Démarrer une séance libre</button></Card>
  </div>

  const isInterrupted = detail.session.status === 'interrompue'
  const setCount = detail.exercises.reduce((sum, exercise) => sum + exercise.sets.filter(set => set.status === 'validee' && set.setType === 'travail').length, 0)
  const timerSeconds = timerEnd ? Math.ceil((timerEnd - clockNow) / 1000) : 0

  return <div className="space-y-4 pb-8">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><PageTitle title={detail.session.name} subtitle={`Séance en direct · ${formatElapsed(detail.session.startedAt, elapsed)} écoulées · ${setCount} séries validées`} /><div className="flex shrink-0 flex-wrap gap-2"><button disabled={busy || isInterrupted} onClick={() => void pauseSession()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-ink disabled:opacity-50"><CirclePause size={17} /> Mettre en pause</button><button disabled={busy} onClick={() => setShowFinish(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white disabled:opacity-50"><Check size={17} /> Terminer</button></div></div>
    {isInterrupted && <Card className="border-amber-200 bg-amber-50"><p className="font-semibold text-amber-900">Séance sauvegardée et en pause</p><p className="mt-1 text-sm text-amber-900">Reprends quand tu es prêt. Les séries saisies sont conservées.</p><button disabled={busy} onClick={() => void resumeSession()} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-700 px-4 font-semibold text-white"><Play size={17} /> Reprendre la séance</button></Card>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{success}</p>}
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold text-ink">Exercices de la séance</h2><p className="text-sm text-muted">Les noms et consignes sont enregistrés comme instantanés de cette séance.</p></div><div className="flex w-full gap-2 sm:w-auto"><select aria-label="Ajouter un exercice" value={chosenExercise} onChange={event => setChosenExercise(event.target.value)} disabled={isInterrupted || busy} className={`${fieldClass} min-w-0 flex-1 sm:w-64`}><option value="">Ajouter depuis la bibliothèque…</option>{libraryOptions.map(exercise => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select><button disabled={!chosenExercise || busy || isInterrupted} onClick={() => void addExercise()} aria-label="Ajouter l’exercice" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white disabled:opacity-40"><Plus size={18} /></button></div></div>
          {!detail.exercises.length ? <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">Aucun exercice pour l’instant. Choisis-en un dans la bibliothèque pour commencer.</p> : <div className="flex gap-2 overflow-x-auto pb-2">{detail.exercises.map((exercise, index) => <button key={exercise.id} onClick={() => setCurrentExerciseId(exercise.id)} aria-pressed={currentExercise?.id === exercise.id} className={`min-h-11 shrink-0 rounded-xl border px-3 text-sm font-semibold ${currentExercise?.id === exercise.id ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-line bg-surface text-muted'}`}>{index + 1}. {exercise.exerciseNameSnapshot}</button>)}</div>}
        </Card>

        {currentExercise && <Card>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-ink">{currentExercise.exerciseNameSnapshot}</h2><p className="mt-1 text-sm text-muted">{currentExercise.restSecondsSnapshot !== undefined ? `Repos conseillé : ${currentExercise.restSecondsSnapshot} s` : 'Séries et charge saisies pendant la séance.'}</p></div><div className="flex gap-1"><button disabled={busy || isInterrupted || detail.exercises[0]?.id === currentExercise.id} aria-label={`Monter ${currentExercise.exerciseNameSnapshot}`} onClick={() => void workoutService.moveExercise(currentExercise.id, -1).then(() => refreshDetail(detail.session.id)).catch(cause => setError(messageOf(cause)))} className="flex h-11 w-11 items-center justify-center rounded-lg border border-line disabled:opacity-30"><ArrowUp size={17} /></button><button disabled={busy || isInterrupted || detail.exercises.at(-1)?.id === currentExercise.id} aria-label={`Descendre ${currentExercise.exerciseNameSnapshot}`} onClick={() => void workoutService.moveExercise(currentExercise.id, 1).then(() => refreshDetail(detail.session.id)).catch(cause => setError(messageOf(cause)))} className="flex h-11 w-11 items-center justify-center rounded-lg border border-line disabled:opacity-30"><ArrowDown size={17} /></button></div></div>
          <div className="mt-4 space-y-2">{currentExercise.sets.map(set => <div key={set.id} className={`rounded-xl border p-3 ${set.status === 'validee' ? 'border-emerald-200 bg-emerald-50/70' : 'border-line bg-surface2/40'}`}>
            <div className="mb-2 flex items-center justify-between"><p className="text-sm font-bold text-ink">Série {set.setNumber}{set.setType === 'echauffement' ? ' · échauffement' : ''}</p>{set.status === 'validee' && <span className="text-xs font-semibold text-emerald-800">Validée</span>}</div>
            <div className="grid grid-cols-[minmax(0,1fr)_80px_minmax(0,1fr)] items-end gap-2"><label><span className="mb-1 block text-xs font-semibold text-muted">Charge</span><input aria-label={`Charge série ${set.setNumber}`} className={fieldClass} type="number" min="0" max="1000" step="0.5" inputMode="decimal" value={set.loadValue} disabled={set.status === 'validee' || isInterrupted} onChange={event => updateLocalSet(currentExercise, set, { loadValue: Number(event.target.value) })} /></label><label><span className="mb-1 block text-xs font-semibold text-muted">Unité</span><select aria-label={`Unité série ${set.setNumber}`} className={fieldClass} value={set.loadUnit} disabled={set.status === 'validee' || isInterrupted} onChange={event => updateLocalSet(currentExercise, set, { loadUnit: event.target.value as 'kg' | 'lb' })}><option value="kg">kg</option><option value="lb">lb</option></select></label><label><span className="mb-1 block text-xs font-semibold text-muted">Répétitions</span><input aria-label={`Répétitions série ${set.setNumber}`} className={fieldClass} type="number" min="0" max="1000" step="1" inputMode="numeric" value={set.repetitions} disabled={set.status === 'validee' || isInterrupted} onChange={event => updateLocalSet(currentExercise, set, { repetitions: Number(event.target.value) })} /></label></div>
            {draftErrors[set.id] && <p role="alert" className="mt-2 text-xs text-red-700">{draftErrors[set.id]}</p>}
            {set.status === 'en_saisie' && <div className="mt-2 flex flex-wrap gap-2"><button disabled={busy || isInterrupted} onClick={() => void completeSet(set)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white disabled:opacity-50"><Check size={16} /> Valider la série</button><button disabled={busy || isInterrupted} onClick={() => void skipSet(set)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-muted disabled:opacity-50"><SkipForward size={16} /> Ignorer</button></div>}
          </div>)}</div>
          <div className="mt-3 flex gap-2"><button disabled={busy || isInterrupted} onClick={() => void addSet('travail')} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-ink disabled:opacity-40"><Plus size={16} /> Ajouter une série</button><button disabled={busy || isInterrupted} onClick={() => void addSet('echauffement')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-muted disabled:opacity-40"><Plus size={16} /> Échauffement</button></div>
        </Card>}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <Card className="text-center"><p className="flex items-center justify-center gap-2 text-sm font-semibold text-muted"><Clock3 size={17} /> {timerSeconds > 0 ? 'Temps de repos' : 'Minuteur de repos'}</p><p aria-live="polite" className={`numeric my-2 text-5xl font-bold tracking-tight ${timerSeconds > 0 ? 'text-accent' : 'text-ink'}`}>{formatClock(timerSeconds)}</p><p className="text-xs text-muted">Le décompte utilise une heure de fin absolue, donc reste correct en arrière-plan.</p>{timerSeconds > 0 ? <button onClick={() => setTimerEnd(undefined)} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold"><SkipForward size={16} /> Passer le repos</button> : <button disabled={isInterrupted || busy} onClick={async () => { const seconds = currentExercise?.restSecondsSnapshot ?? (await getPreferences()).defaultRestSeconds; if (seconds > 0) setTimerEnd(Date.now() + seconds * 1000) }} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold disabled:opacity-40"><TimerReset size={16} /> Démarrer le repos</button>}</Card>
        <Card><div className="flex items-center gap-2"><Square size={16} /><h2 className="font-bold text-ink">Sauvegarde locale</h2></div><p className="mt-1 text-sm text-muted">Les séries validées et les brouillons sont conservés sur cet appareil. Tu peux fermer l’onglet et reprendre cette séance plus tard.</p><button disabled={busy || isInterrupted} onClick={() => void pauseSession()} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold disabled:opacity-40"><CirclePause size={16} /> Mettre en pause et quitter</button><button disabled={busy} onClick={() => void cancelSession()} className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-700 disabled:opacity-40"><X size={16} /> Annuler la séance</button></Card>
      </aside>
    </div>

    {showFinish && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"><section role="dialog" aria-modal="true" aria-labelledby="finish-title" className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-xl sm:max-w-lg sm:rounded-3xl"><h2 id="finish-title" className="text-lg font-bold text-ink">Terminer la séance ?</h2><p className="mt-1 text-sm text-muted">Les séries encore en saisie seront ignorées; les séries validées seront conservées.</p><label className="mt-4 block text-sm font-semibold text-ink">Effort global (facultatif, 1–10)<select value={effort} onChange={event => setEffort(event.target.value)} className={`${fieldClass} mt-1`}><option value="">Ne pas noter</option>{Array.from({ length: 10 }, (_, i) => i + 1).map(value => <option key={value} value={value}>{value}/10</option>)}</select></label><label className="mt-3 block text-sm font-semibold text-ink">Note (facultative)<textarea maxLength={1000} value={notes} onChange={event => setNotes(event.target.value)} className={`${fieldClass} mt-1 py-3`} rows={3} placeholder="Comment s’est passée ta séance ?" /></label><div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button disabled={busy} onClick={() => setShowFinish(false)} className="min-h-11 rounded-xl border border-line px-4 font-semibold">Continuer</button><button disabled={busy} onClick={() => void finishSession()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 font-bold text-white disabled:opacity-50"><Check size={17} /> Terminer et enregistrer</button></div></section></div>}
    <div className="flex flex-wrap gap-2 border-t border-line pt-3 text-sm"><Link to="/progression" className="font-semibold text-accent hover:underline">Voir l’historique et la progression</Link><span aria-hidden="true" className="text-muted">·</span><Link to="/" className="font-semibold text-accent hover:underline">Retour à l’accueil</Link></div>
  </div>
}
