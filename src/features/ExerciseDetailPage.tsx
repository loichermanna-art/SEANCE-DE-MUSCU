import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Medal, Trophy } from 'lucide-react'
import { db } from '../services/db'
import { getExerciseHistory } from '../services/historyService'
import { buildLoadProgression } from '../domain/history'
import { computeExerciseRecords } from '../domain/calculations'
import { Card, EmptyState, PageTitle } from '../components/ui'
import {
  BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Bar,
} from 'recharts'

const chartTheme = { grid: 'var(--color-line)', axis: 'var(--color-muted)', accent: 'var(--color-accent)' }

export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<'records' | 'chart'>('records')

  const data = useLiveQuery(async () => {
    if (!id) return null
    const exercise = await db.exercises.get(id)
    if (!exercise) return null
    const history = await getExerciseHistory(id)
    const [groups, links] = await Promise.all([db.muscleGroups.toArray(), db.exerciseMuscles.toArray()])
    const muscleNames = links
      .filter((l) => l.exerciseId === id)
      .map((l) => ({ name: groups.find((g) => g.id === l.muscleGroupId)?.name ?? '', role: l.role }))
    return { exercise, history, muscleNames }
  }, [id])

  const records = useMemo(() => {
    if (!data) return null
    return computeExerciseRecords(data.history.map((h) => h.sets))
  }, [data])

  const points = useMemo(() => {
    if (!data) return []
    return buildLoadProgression(data.history.map((h) => ({ sessionId: h.sessionId, date: h.date, sets: h.sets })))
  }, [data])

  const chartData = points.map((p) => ({
    date: new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    'Charge (kg)': p.loadValue,
    'Répétitions': p.repetitions,
  }))

  if (data === undefined) return <PageTitle title="Exercice" subtitle="Chargement…" />
  if (!data) {
    return (
      <EmptyState
        icon={<Medal size={28} />}
        title="Exercice introuvable"
        message="Il a peut-être été supprimé."
        action={{ label: 'Retour à la bibliothèque', to: '/exercices' }}
      />
    )
  }

  const { exercise, history, muscleNames } = data

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/exercices" className="rounded-xl border border-line p-2 text-muted transition hover:text-ink" aria-label="Retour à la bibliothèque">
          <ArrowLeft size={18} />
        </Link>
        <PageTitle title={exercise.name} subtitle={exercise.description} />
      </div>

      <p className="mb-1 flex flex-wrap gap-1.5">
        {muscleNames.filter((m) => m.role === 'principal').map((m) => (
          <span key={m.name} className="rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-medium text-accent">{m.name}</span>
        ))}
        {muscleNames.filter((m) => m.role === 'secondaire').map((m) => (
          <span key={m.name} className="rounded-full bg-surface2 px-2 py-0.5 text-[11px] font-medium text-muted">{m.name}</span>
        ))}
      </p>

      <Card className="mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Consignes d’exécution</h3>
        <p className="mt-1 text-sm">{exercise.instructions}</p>
        {exercise.commonMistakes ? (
          <>
            <h3 className="mt-3 text-sm font-bold uppercase tracking-wide text-muted">Erreurs fréquentes</h3>
            <p className="mt-1 text-sm">{exercise.commonMistakes}</p>
          </>
        ) : null}
      </Card>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab('records')}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${tab === 'records' ? 'bg-accent text-accent-ink' : 'border border-line text-muted hover:text-ink'}`}
        >
          Records & performances
        </button>
        <button
          onClick={() => setTab('chart')}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${tab === 'chart' ? 'bg-accent text-accent-ink' : 'border border-line text-muted hover:text-ink'}`}
        >
          Graphique de charge
        </button>
      </div>

      {tab === 'records' ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card><p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Charge max</p><p className="numeric mt-1 text-2xl font-bold">{records?.bestLoad !== null && records?.bestLoad !== undefined ? `${records.bestLoad} kg` : '—'}</p></Card>
            <Card><p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Reps max</p><p className="numeric mt-1 text-2xl font-bold">{records?.bestReps ?? '—'}</p></Card>
            <Card><p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Meilleur volume / séance</p><p className="numeric mt-1 text-2xl font-bold">{records?.bestSessionVolume !== null && records?.bestSessionVolume !== undefined ? `${records.bestSessionVolume.toLocaleString('fr-FR')} kg` : '—'}</p></Card>
            <Card><p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Séries de travail</p><p className="numeric mt-1 text-2xl font-bold">{records?.totalWorkSets ?? 0}</p></Card>
          </div>
          <p className="mt-2 text-xs text-muted">Critères §8.4 : records sur séries validées de travail uniquement ; une première référence n’est pas annoncée comme « record ».</p>

          <Card className="mt-4">
            <h3 className="mb-2 flex items-center gap-2 font-bold"><Trophy size={16} /> Dernières performances</h3>
            {history.length === 0 ? (
              <p className="py-3 text-sm text-muted">Aucune série validée sur cet exercice — fais ta première séance pour lancer l’historique.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {history.slice(0, 8).map((h) => (
                  <li key={h.sessionId} className="rounded-xl border border-line bg-surface2/30 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{new Date(h.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                      <p className="text-xs text-muted">{h.sessionName}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {h.sets.map((s) => s.setType === 'echauffement' ? `éch. ${s.repetitions}` : `${s.loadValue} kg × ${s.repetitions}`).join(' · ')}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </>
      ) : (
        <Card>
          <h3 className="mb-3 font-bold">Charge au fil des séances (top set)</h3>
          {chartData.length === 0 ? (
            <p className="py-4 text-sm text-muted">Pas assez de données pour tracer une courbe.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
                  <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: chartTheme.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: chartTheme.axis, fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, fontSize: 12 }} labelStyle={{ color: 'var(--color-ink)' }} />
                  <Line type="monotone" dataKey="Charge (kg)" stroke={chartTheme.accent} strokeWidth={2.5} dot={{ r: 3, fill: chartTheme.accent }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {chartData.length > 1 ? (
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-bold">Volume du top set par séance</h4>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
                    <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: chartTheme.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: chartTheme.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, fontSize: 12 }} labelStyle={{ color: 'var(--color-ink)' }} />
                    <Bar dataKey="Charge (kg)" fill="var(--color-success)" radius={[6, 6, 0, 0]} name="Charge (kg)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  )
}
