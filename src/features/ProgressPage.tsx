import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, CalendarDays, Clock3, Dumbbell, RefreshCw, TrendingUp } from 'lucide-react'
import { Card, EmptyState, PageTitle, Stat } from '../components/ui'
import { historyService, type ExerciseProgress, type HistorySession } from '../services/historyService'

function dateLabel(value?: string) {
  if (!value) return 'Date inconnue'
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
function durationLabel(seconds: number | null) {
  if (seconds === null) return 'Durée inconnue'
  const minutes = Math.round(seconds / 60)
  return `${minutes} min`
}
function numberLabel(value: number | null, decimals = 1) {
  if (value === null) return '—'
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: decimals }).format(value)
}
function errorText(error: unknown) { return error instanceof Error ? error.message : 'Impossible de charger l’historique.' }

export default function ProgressPage() {
  const [history, setHistory] = useState<HistorySession[]>([])
  const [progress, setProgress] = useState<ExerciseProgress>()
  const [selectedExercise, setSelectedExercise] = useState('')
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [progressLoading, setProgressLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadHistory() {
    setLoading(true); setError('')
    try { setHistory(await historyService.listCompletedSessions()) }
    catch (cause) { setError(errorText(cause)) }
    finally { setLoading(false) }
  }
  useEffect(() => { void loadHistory() }, [])

  const exerciseOptions = Array.from(new Map(history.flatMap(session => session.exercises
    .filter(exercise => exercise.exerciseId)
    .map(exercise => [exercise.exerciseId!, exercise.name] as const))).entries())
  useEffect(() => {
    if (!selectedExercise && exerciseOptions.length) setSelectedExercise(exerciseOptions[0][0])
    else if (selectedExercise && !exerciseOptions.some(([id]) => id === selectedExercise)) setSelectedExercise(exerciseOptions[0]?.[0] ?? '')
  }, [exerciseOptions, selectedExercise])

  useEffect(() => {
    if (!selectedExercise) { setProgress(undefined); return }
    let active = true
    setProgressLoading(true)
    void historyService.getExerciseProgress(selectedExercise)
      .then(result => { if (active) setProgress(result) })
      .catch(cause => { if (active) setError(errorText(cause)) })
      .finally(() => { if (active) setProgressLoading(false) })
    return () => { active = false }
  }, [selectedExercise, history.length])

  const totalWorkSets = history.reduce((sum, session) => sum + session.totalWorkSets, 0)
  const chartPoints = progress?.points.map(point => ({
    ...point,
    dateLabel: new Date(point.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
  })) ?? []
  const recentSuggestion = progress?.suggestion

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><PageTitle title="Historique & progression" subtitle="Tes séances et tes tendances, calculées uniquement à partir des séries terminées." /><button onClick={() => void loadHistory()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-ink disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualiser</button></div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {loading ? <Card><p role="status" className="flex items-center gap-2 py-6 text-sm text-muted"><RefreshCw className="animate-spin" size={18} /> Chargement de tes séances…</p></Card> : history.length === 0 ? <EmptyState icon={<Dumbbell size={28} />} title="Aucune séance terminée" message="Les statistiques se construiront après tes vraies séances. Aucune donnée de démonstration n’est affichée." action={{ label: 'Commencer une séance', to: '/seance' }} /> : <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Séances terminées" value={String(history.length)} hint="Historique conservé sur cet appareil" /><Stat label="Séries de travail" value={String(totalWorkSets)} hint="Séries validées uniquement" /><Stat label="Dernière séance" value={dateLabel(history[0].session.endedAt)} hint={history[0].session.name} /><Stat label="Exercices suivis" value={String(exerciseOptions.length)} hint="Exercices présents dans l’historique" /></div>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="flex items-center gap-2 font-bold text-ink"><TrendingUp size={18} /> Progression par exercice</h2><p className="mt-1 text-sm text-muted">Les charges sont normalisées en kilogrammes pour comparer les séances saisies en kg ou lb.</p></div><label className="w-full sm:max-w-sm"><span className="mb-1 block text-xs font-semibold text-muted">Exercice</span><select value={selectedExercise} onChange={event => setSelectedExercise(event.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink"><option value="">Choisir un exercice…</option>{exerciseOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label></div>
        {progressLoading ? <p role="status" className="mt-5 text-sm text-muted">Calcul de la progression…</p> : !progress || !progress.points.length ? <p className="mt-5 rounded-xl border border-dashed border-line p-4 text-sm text-muted">Pas encore assez de séances terminées pour afficher cette progression.</p> : <div className="mt-5 space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Charge maximale" value={progress.records.bestLoad === null ? '—' : `${numberLabel(progress.records.bestLoad)} kg`} hint="Série de travail validée" /><Stat label="Répétitions max." value={String(progress.records.bestReps ?? '—')} hint="Toutes charges confondues" /><Stat label="Volume record" value={progress.records.bestSessionVolume === null ? '—' : `${numberLabel(progress.records.bestSessionVolume, 0)} kg·rép.`} hint="Une séance comparable" /><Stat label="Séries cumulées" value={String(progress.records.totalWorkSets)} hint="Séries de travail validées" /></div>
          {progress.stagnating && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>Plateau possible.</strong> Les trois expositions comparables récentes ne montrent pas de progression de charge ni de répétitions. Vérifie récupération, technique et comparabilité; ce signal n’est pas un diagnostic.</div>}
          {recentSuggestion && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-blue-900">Prochaine étape suggérée · jamais appliquée automatiquement</p><p className="mt-1 text-sm leading-6 text-blue-950">{recentSuggestion.message}</p></div>}
          <div className="grid gap-4 xl:grid-cols-2">
            <section aria-label="Graphique de charge maximale"><h3 className="mb-2 flex items-center gap-2 text-sm font-bold"><Activity size={16} /> Charge maximale par séance (kg)</h3><div className="h-56 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartPoints} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="#dbe2ea" /><XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={value => [`${numberLabel(Number(value))} kg`, 'Charge max.']} /><Line type="monotone" dataKey="bestLoad" name="Charge max." stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} connectNulls /></LineChart></ResponsiveContainer></div></section>
            <section aria-label="Graphique de volume"><h3 className="mb-2 flex items-center gap-2 text-sm font-bold"><Activity size={16} /> Volume de travail (kg·rép.)</h3><div className="h-56 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartPoints} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="#dbe2ea" /><XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={value => [`${numberLabel(Number(value), 0)} kg·rép.`, 'Volume']} /><Bar dataKey="volume" name="Volume" fill="#10b981" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
          </div>
        </div>}
      </Card>

      <Card><h2 className="mb-3 flex items-center gap-2 font-bold text-ink"><CalendarDays size={18} /> Séances récentes</h2><div className="space-y-3">{history.map(item => <article key={item.session.id} className="rounded-xl border border-line bg-surface p-3 sm:p-4"><button aria-expanded={expandedSession === item.session.id} onClick={() => setExpandedSession(expandedSession === item.session.id ? null : item.session.id)} className="flex min-h-11 w-full flex-col items-start justify-between gap-2 text-left sm:flex-row sm:items-center"><span className="font-bold text-ink">{item.session.name}</span><span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted"><span>{dateLabel(item.session.endedAt)}</span><span className="inline-flex items-center gap-1"><Clock3 size={13} />{durationLabel(item.durationSeconds)}</span><span>{item.totalWorkSets} séries</span>{item.volume === null ? <span>Volume non mesurable</span> : <span>{numberLabel(item.volume, 0)} kg·rép.</span>}</span></button>{expandedSession === item.session.id && <div className="mt-3 space-y-3 border-t border-line pt-3">{item.session.overallEffort && <p className="text-sm text-muted">Effort global : {item.session.overallEffort}/10</p>}{item.session.notes && <p className="whitespace-pre-wrap text-sm text-muted">{item.session.notes}</p>}{item.exercises.map(exercise => <div key={exercise.id} className="rounded-lg bg-surface2/60 p-3"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold text-ink">{exercise.order}. {exercise.name}</h3><span className="text-xs text-muted">{exercise.bestLoad === null ? 'Poids du corps / charge non mesurée' : `Max. ${numberLabel(exercise.bestLoad)} kg`} · {exercise.sets.filter(set => set.status === 'validee' && set.setType === 'travail').length} séries</span></div><p className="mt-1 text-xs leading-5 text-muted">{exercise.sets.filter(set => set.status === 'validee').map(set => `${set.setType === 'echauffement' ? 'Échauffement' : 'Série'} ${set.setNumber}: ${numberLabel(set.loadValue)} ${set.loadUnit} × ${set.repetitions}${set.rir === undefined ? '' : ` · RIR ${set.rir}`}`).join(' · ') || 'Aucune série validée'}</p></div>)}</div>}</article>)}</div></Card>
    </>}
  </div>
}
