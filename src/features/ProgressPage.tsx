import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { TrendingUp, TrendingDown, Minus, Activity, Dumbbell, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { db } from '../services/db'
import { getExerciseHistory, getSessionsForWeeklyBuckets, listSessionSummaries } from '../services/historyService'
import { buildLoadProgression, buildWeeklyBuckets, trendOf } from '../domain/history'
import { formatDuration } from '../domain/session'
import { Card, EmptyState, PageTitle } from '../components/ui'

const chartTheme = {
  grid: 'var(--color-line)',
  axis: 'var(--color-muted)',
  accent: 'var(--color-accent)',
  success: 'var(--color-success)',
}

/** Bilan hebdomadaire : cette semaine vs la précédente (§8). */
function WeeklyBilan() {
  const buckets = useLiveQuery(async () => buildWeeklyBuckets(await getSessionsForWeeklyBuckets(), 9), [])
  if (!buckets) return null
  const current = buckets[buckets.length - 1]
  const previous = buckets[buckets.length - 2]

  const delta = (now: number | null, before: number | null): { icon: 'up' | 'down' | 'flat'; text: string } => {
    if (now === null && before === null) return { icon: 'flat', text: '—' }
    const n = now ?? 0
    const b = before ?? 0
    if (n > b) return { icon: 'up', text: `+${n - b} vs sem. dernière` }
    if (n < b) return { icon: 'down', text: `${n - b} vs sem. dernière` }
    return { icon: 'flat', text: '= sem. dernière' }
  }

  const rows = [
    { label: 'Séances', value: String(current.sessions), delta: delta(current.sessions, previous.sessions) },
    { label: 'Temps d’entraînement', value: formatDuration(current.minutes * 60), delta: delta(current.minutes, previous.minutes) },
    { label: 'Séries de travail', value: String(current.totalSets), delta: delta(current.totalSets, previous.totalSets) },
    { label: 'Répétitions', value: String(current.totalReps), delta: delta(current.totalReps, previous.totalReps) },
    { label: 'Volume total', value: current.volume !== null ? `${current.volume.toLocaleString('fr-FR')} kg` : '—', delta: delta(current.volume, previous.volume) },
  ]

  const DeltaIcon = ({ d }: { d: { icon: 'up' | 'down' | 'flat' } }) =>
    d.icon === 'up' ? <TrendingUp size={13} className="text-success" />
    : d.icon === 'down' ? <TrendingDown size={13} className="text-warning" />
    : <Minus size={13} className="text-muted" />

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-bold"><Activity size={18} /> Bilan de la semaine</h2>
      <p className="mb-3 text-xs text-muted">Semaine du {current.label} — comparée à la précédente. Uniquement des séances réellement terminées.</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {rows.map((r) => (
          <div key={r.label} className="rounded-xl bg-surface2/40 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{r.label}</p>
            <p className="numeric mt-0.5 text-xl font-bold">{r.value}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted"><DeltaIcon d={r.delta} />{r.delta.text}</p>
          </div>
        ))}
      </div>
      {/* Graphique hebdomadaire */}
      <div className="mt-4">
        <h3 className="mb-2 text-sm font-bold">Séances par semaine</h3>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={buckets} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: chartTheme.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: chartTheme.axis, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: 'var(--color-ink)' }}
                itemStyle={{ color: 'var(--color-accent)' }}
              />
              <Bar dataKey="sessions" name="Séances" fill={chartTheme.accent} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  )
}

/** Progression de charge par exercice (§8.4) — top set par séance. */
function LoadProgressionChart() {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('')
  const data = useLiveQuery(async () => {
    const exercises = (await db.exercises.toArray())
      .filter((e) => e.id === selectedExerciseId || (selectedExerciseId === '' && true))
    const histories = await Promise.all(
      exercises.map(async (e) => ({
        exercise: e,
        points: buildLoadProgression((await getExerciseHistory(e.id)).map((h) => ({
          sessionId: h.sessionId, date: h.date, sets: h.sets,
        }))),
      })),
    )
    return histories
  }, [selectedExerciseId])

  const withHistory = (data ?? []).filter((h) => h.points.length > 0)
  const selected = selectedExerciseId ? withHistory.find((h) => h.exercise.id === selectedExerciseId) : undefined
  const display = selected ?? withHistory[0]
  const chartData = display?.points.map((p) => ({
    date: new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    'Charge (kg)': p.loadValue,
    'Répétitions': p.repetitions,
  })) ?? []

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="flex items-center gap-2 font-bold"><TrendingUp size={18} /> Progression de charge</h2>
        {withHistory.length > 0 ? (
          <select
            value={display?.exercise.id ?? ''}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
            className="ml-auto rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            aria-label="Choisir l’exercice"
          >
            {withHistory.map((h) => <option key={h.exercise.id} value={h.exercise.id}>{h.exercise.name}</option>)}
          </select>
        ) : null}
      </div>
      {!display ? (
        <p className="py-4 text-sm text-muted">Termine des séances avec des charges pour voir ta progression ici — aucune donnée inventée.</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted">
            Top set par séance · tendance : {(() => {
              const t = trendOf(display.points)
              return t === 'progress' ? '📈 en hausse' : t === 'baisse' ? '📉 en baisse' : t === 'stable' ? '➖ stable' : 'données insuffisantes'
            })()}
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: chartTheme.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: chartTheme.axis, fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: 'var(--color-ink)' }}
                />
                <Line type="monotone" dataKey="Charge (kg)" stroke={chartTheme.accent} strokeWidth={2.5} dot={{ r: 3, fill: chartTheme.accent }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  )
}

/** Volume par séance terminée (§8.2) — jamais de volume inventé au PDC. */
function VolumeChart() {
  const sessions = useLiveQuery(() => listSessionSummaries(), [])
  const chartData = useMemo(
    () => (sessions ?? [])
      .filter((s) => s.summary.volume !== null)
      .slice(-12)
      .reverse()
      .map((s) => ({
        date: new Date(s.endedAt!).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        'Volume (kg)': s.summary.volume!,
        name: s.name,
      })),
    [sessions],
  )

  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 font-bold"><Dumbbell size={18} /> Volume par séance</h2>
      {chartData.length === 0 ? (
        <p className="py-4 text-sm text-muted">Aucun volume mesurable pour l’instant (les séances au poids du corps n’ont pas de volume exact, §8.2).</p>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: chartTheme.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: chartTheme.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: 'var(--color-ink)' }}
                itemStyle={{ color: chartTheme.success }}
              />
              <Bar dataKey="Volume (kg)" name="Volume (kg)" fill={chartTheme.success} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

/** Historique des séances terminées. */
function SessionHistory() {
  const sessions = useLiveQuery(() => listSessionSummaries(), [])
  const [openId, setOpenId] = useState<string | null>(null)

  if (!sessions || sessions.length === 0) {
    return (
      <Card>
        <h2 className="mb-1 flex items-center gap-2 font-bold"><CalendarDays size={18} /> Historique des séances</h2>
        <p className="text-sm text-muted">Aucune séance terminée pour l’instant — l’historique se construit à chaque séance réelle.</p>
      </Card>
    )
  }

  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 font-bold"><CalendarDays size={18} /> Historique des séances</h2>
      <ol className="divide-y divide-line">
        {sessions.map((s) => {
          const open = openId === s.sessionId
          return (
            <li key={s.sessionId}>
              <button
                onClick={() => setOpenId(open ? null : s.sessionId)}
                className="flex w-full items-center gap-3 py-3 text-left"
                aria-expanded={open}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-muted">
                    {s.endedAt ? new Date(s.endedAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}
                    {s.programName ? ` · ${s.programName}` : ''}{s.dayName ? ` — ${s.dayName}` : ''}
                  </p>
                </div>
                <span className="text-xs text-muted numeric">{s.summary.totalSets} séries · {s.summary.totalReps} reps</span>
                <span className="hidden text-xs text-muted numeric sm:block">{s.summary.volume !== null ? `${s.summary.volume.toLocaleString('fr-FR')} kg` : 'PDC'}</span>
                {open ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
              </button>
              {open ? (
                <ul className="mb-3 flex flex-col gap-1.5 pl-4">
                  {s.summary.exercises.map((ex) => (
                    <li key={ex.name} className="flex items-center justify-between gap-3 rounded-lg bg-surface2/40 px-3 py-2 text-sm">
                      <span className="truncate">{ex.name}</span>
                      <span className="shrink-0 text-xs text-muted">
                        {ex.workSets} × {ex.reps} reps{ex.bestLoad ? ` · max ${ex.bestLoad} kg` : ''}{ex.volume !== null ? ` · ${ex.volume.toLocaleString('fr-FR')} kg` : ''}
                      </span>
                    </li>
                  ))}
                  <li className="pl-3 text-xs text-muted">Durée : {formatDuration(s.summary.durationSeconds)}</li>
                </ul>
              ) : null}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

export default function ProgressPage() {
  const hasAny = useLiveQuery(async () => (await db.workoutSessions.where('status').equals('terminee').count()) > 0, [])

  return (
    <div>
      <PageTitle title="Progression" subtitle="Historique, volume et charges — alimentés uniquement par tes vraies séances." />
      {hasAny === false ? (
        <EmptyState
          icon={<Activity size={28} />}
          title="Aucune donnée de progression"
          message="C’est normal : GYM OS n’invente jamais de chiffres. Termine ta première séance (onglet Séance) et cette page se remplira automatiquement."
          action={{ label: 'Démarrer une séance', to: '/seance' }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <WeeklyBilan />
          <div className="grid gap-4 lg:grid-cols-2">
            <LoadProgressionChart />
            <VolumeChart />
          </div>
          <SessionHistory />
        </div>
      )}
    </div>
  )
}
