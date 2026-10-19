import { useEffect, useState, type FormEvent } from 'react'
import { AlertTriangle, Check, HeartPulse, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { MuscleGroup, PainType } from '../domain/types'
import { Card, EmptyState, PageTitle } from '../components/ui'
import { recoveryService, type RecoveryRecord, type SorenessInput } from '../services/recoveryService'

const selectClass = 'min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-blue-100'
const numberOptions = [1, 2, 3, 4, 5]

function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Le bilan n’a pas pu être enregistré. Réessaie.' }
function formatDate(value: string) { return new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) }

export default function RecoveryPage() {
  const [muscles, setMuscles] = useState<MuscleGroup[]>([])
  const [programDays, setProgramDays] = useState<Array<{ id: string; label: string }>>([])
  const [recent, setRecent] = useState<RecoveryRecord[]>([])
  const [energy, setEnergy] = useState('')
  const [sleep, setSleep] = useState('')
  const [sleepQuality, setSleepQuality] = useState('')
  const [fatigue, setFatigue] = useState('')
  const [notes, setNotes] = useState('')
  const [targetDay, setTargetDay] = useState('')
  const [soreness, setSoreness] = useState<Record<string, { severity: number; painType: PainType }>>({})
  const [saved, setSaved] = useState<RecoveryRecord>()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const [groups, days, history] = await Promise.all([recoveryService.listMuscleGroups(), recoveryService.listProgramDays(), recoveryService.listRecent()])
      setMuscles(groups); setProgramDays(days); setRecent(history)
      setSoreness(current => Object.fromEntries(groups.map(group => [group.id, current[group.id] ?? { severity: 0, painType: 'courbature' as const }])))
    } catch (cause) { setError(errorMessage(cause)) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const entries: SorenessInput[] = muscles.map(muscle => ({
        muscleGroupId: muscle.id,
        severity: (soreness[muscle.id]?.severity ?? 0) as 0 | 1 | 2 | 3 | 4,
        painType: soreness[muscle.id]?.painType ?? 'courbature',
      }))
      const result = await recoveryService.save({
        energyLevel: energy ? Number(energy) : undefined,
        sleepDurationHours: sleep ? Number(sleep) : undefined,
        sleepQuality: sleepQuality ? Number(sleepQuality) : undefined,
        generalFatigue: fatigue ? Number(fatigue) : undefined,
        notes,
      }, entries, targetDay || undefined)
      setSaved(result)
      setRecent(await recoveryService.listRecent())
    } catch (cause) { setError(errorMessage(cause)) }
    finally { setBusy(false) }
  }

  if (loading) return <div><PageTitle title="Récupération" subtitle="Un bilan rapide, des conseils prudents et expliqués." /><Card><p role="status" className="flex items-center gap-2 py-5 text-sm text-muted"><RefreshCw className="animate-spin" size={18} /> Chargement des muscles et bilans…</p></Card></div>

  return <div className="space-y-5">
    <PageTitle title="Récupération" subtitle="Signale tes sensations avant de t’entraîner. Les recommandations restent transparentes, facultatives et ne remplacent pas un avis médical." />
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {!muscles.length ? <EmptyState icon={<HeartPulse size={28} />} title="Groupes musculaires indisponibles" message="Les données de référence n’ont pas pu être chargées sur cet appareil." action={{ label: 'Réessayer la page', to: '/recuperation' }} /> : <>
      {saved && <section aria-labelledby="recovery-advice-heading" className={`rounded-2xl border p-4 sm:p-5 ${saved.advice.medicalWarning ? 'border-red-300 bg-red-50' : saved.advice.situation === 'D' ? 'border-amber-300 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}><h2 id="recovery-advice-heading" className="flex items-center gap-2 font-bold text-ink">{saved.advice.medicalWarning ? <AlertTriangle size={19} /> : <Check size={19} />} {saved.advice.title}</h2><p className="mt-2 text-sm leading-6 text-ink">{saved.advice.message}</p>{saved.advice.reasons.length > 0 && <ul className="mt-2 list-inside list-disc text-sm font-semibold text-ink">{saved.advice.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}<p className="mt-3 border-t border-current/10 pt-2 text-xs leading-5 text-muted">Conseil de bien-être non médical. Une douleur vive, inhabituelle ou persistante mérite une évaluation par un professionnel de santé.</p><Link to="/seance" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-accent px-4 text-sm font-bold text-white">Continuer vers la séance</Link></section>}

      <form onSubmit={submit} className="space-y-4">
        <Card><h2 className="font-bold text-ink">Énergie, sommeil et fatigue</h2><p className="mt-1 text-sm text-muted">Tous les champs sont facultatifs; réponds seulement à ce qui t’aide.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label><span className="mb-1 block text-xs font-semibold text-muted">Énergie (1–5)</span><select value={energy} onChange={event => setEnergy(event.target.value)} className={selectClass}><option value="">Non renseignée</option>{numberOptions.map(value => <option key={value} value={value}>{value}/5</option>)}</select></label>
          <label><span className="mb-1 block text-xs font-semibold text-muted">Sommeil (heures)</span><input type="number" min="0" max="24" step="0.25" inputMode="decimal" value={sleep} onChange={event => setSleep(event.target.value)} placeholder="ex. 7,5" className={selectClass} /></label>
          <label><span className="mb-1 block text-xs font-semibold text-muted">Qualité du sommeil (1–5)</span><select value={sleepQuality} onChange={event => setSleepQuality(event.target.value)} className={selectClass}><option value="">Non renseignée</option>{numberOptions.map(value => <option key={value} value={value}>{value}/5</option>)}</select></label>
          <label><span className="mb-1 block text-xs font-semibold text-muted">Fatigue générale (1–5)</span><select value={fatigue} onChange={event => setFatigue(event.target.value)} className={selectClass}><option value="">Non renseignée</option>{numberOptions.map(value => <option key={value} value={value}>{value}/5</option>)}</select></label>
        </div><label className="mt-3 block"><span className="mb-1 block text-xs font-semibold text-muted">Note personnelle</span><textarea maxLength={1000} rows={2} value={notes} onChange={event => setNotes(event.target.value)} className={`${selectClass} py-3`} placeholder="Comment te sens-tu aujourd’hui ?" /></label></Card>

        <Card><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-bold text-ink">Courbatures et gênes par muscle</h2><p className="mt-1 text-sm text-muted">0 = aucune gêne · 4 = très forte. Une douleur inhabituelle est distinguée des courbatures.</p></div>{programDays.length > 0 && <label className="w-full sm:max-w-sm"><span className="mb-1 block text-xs font-semibold text-muted">Séance du jour (facultatif, pour cibler l’avis)</span><select value={targetDay} onChange={event => setTargetDay(event.target.value)} className={selectClass}><option value="">Conseil général</option>{programDays.map(day => <option key={day.id} value={day.id}>{day.label}</option>)}</select></label>}</div>
          <div className="mt-4 divide-y divide-line">{muscles.map(muscle => <div key={muscle.id} className="grid grid-cols-[minmax(0,1fr)_100px] gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_130px_190px] sm:items-center"><label htmlFor={`soreness-${muscle.id}`} className="font-semibold text-ink">{muscle.name}</label><select id={`soreness-${muscle.id}`} aria-label={`Intensité ${muscle.name}`} value={soreness[muscle.id]?.severity ?? 0} onChange={event => setSoreness(current => ({ ...current, [muscle.id]: { severity: Number(event.target.value), painType: current[muscle.id]?.painType ?? 'courbature' } }))} className={selectClass}>{[0, 1, 2, 3, 4].map(value => <option key={value} value={value}>{value}/4</option>)}</select>{(soreness[muscle.id]?.severity ?? 0) > 0 ? <select aria-label={`Type de gêne ${muscle.name}`} value={soreness[muscle.id]?.painType ?? 'courbature'} onChange={event => setSoreness(current => ({ ...current, [muscle.id]: { severity: current[muscle.id]?.severity ?? 0, painType: event.target.value as PainType } }))} className={`${selectClass} col-span-2 sm:col-span-1`}><option value="courbature">Courbature</option><option value="douleur_inhabituelle">Douleur inhabituelle</option></select> : <span className="hidden text-xs text-muted sm:block">Aucune gêne déclarée</span>}</div>)}</div>
        </Card>
        <button disabled={busy} type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 font-bold text-white disabled:opacity-50"><Check size={18} />{busy ? 'Enregistrement…' : 'Enregistrer mon bilan'}</button>
      </form>

      <Card><h2 className="font-bold text-ink">Bilans récents</h2>{recent.length === 0 ? <p className="mt-2 text-sm text-muted">Aucun bilan enregistré sur cet appareil.</p> : <ul className="mt-2 divide-y divide-line">{recent.map(record => <li key={record.checkin.id} className="py-3"><div className="flex flex-wrap justify-between gap-2"><span className="text-sm font-semibold text-ink">{formatDate(record.checkin.recordedAt)}</span><span className="text-xs text-muted">Énergie {record.checkin.energyLevel ?? '—'}/5 · sommeil {record.checkin.sleepDurationHours ?? '—'} h</span></div><p className="mt-1 text-sm text-muted">{record.advice.title}</p>{record.soreness.filter(item => item.severity > 0).length > 0 && <p className="mt-1 text-xs text-muted">{record.soreness.filter(item => item.severity > 0).map(item => `${item.muscleName} ${item.severity}/4`).join(' · ')}</p>}</li>)}</ul>}</Card>
    </>}
  </div>
}
