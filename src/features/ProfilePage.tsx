import { useEffect, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Download, Save, Target, Trash2, User } from 'lucide-react'
import { addGoal, deleteGoal, exportAllData, getPreferences, getProfile, listGoals, savePreferences, saveProfile } from '../services/profileService'
import { Card, PageTitle } from '../components/ui'
import type { ExperienceLevel, GoalType } from '../domain/types'

const GOAL_LABELS: Record<GoalType, string> = {
  prise_de_masse: 'Prise de masse musculaire',
  force: 'Développement de la force',
  perte_de_masse_grasse: 'Perte de masse grasse',
  recomposition: 'Recomposition corporelle',
  endurance_musculaire: 'Endurance musculaire',
  regularite: 'Régularité',
  groupe_cible: 'Groupe musculaire ciblé',
  condition_generale: 'Condition physique générale',
}

const inputCls = 'w-full rounded-xl border border-line bg-surface2/60 px-3 py-2.5 text-sm outline-none focus:border-accent'
const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-muted'

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [level, setLevel] = useState<ExperienceLevel>('debutant')
  const [preferencesText, setPreferencesText] = useState('')
  const [profileId, setProfileId] = useState<string | undefined>(undefined)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const goals = useLiveQuery(() => listGoals(), [])
  const prefs = useLiveQuery(() => getPreferences(), [])
  const [goalType, setGoalType] = useState<GoalType>('prise_de_masse')
  const [goalText, setGoalText] = useState('')
  const [rest, setRest] = useState(90)
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg')

  useEffect(() => {
    getProfile().then((p) => {
      if (!p) return
      setProfileId(p.id)
      setDisplayName(p.displayName)
      setHeightCm(p.heightCm ? String(p.heightCm) : '')
      setBirthYear(p.birthYear ? String(p.birthYear) : '')
      setLevel(p.experienceLevel)
      setPreferencesText(p.trainingPreferences)
    })
  }, [])

  useEffect(() => {
    if (prefs) { setRest(prefs.defaultRestSeconds); setUnit(prefs.unitSystem) }
  }, [prefs])

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!displayName.trim()) { setError('Indique au moins un nom ou un pseudonyme.'); return }
    const height = heightCm ? Number(heightCm) : undefined
    if (height !== undefined && (height < 100 || height > 250)) { setError('La taille doit être entre 100 et 250 cm.'); return }
    const year = birthYear ? Number(birthYear) : undefined
    if (year !== undefined && (year < 1920 || year > new Date().getFullYear())) { setError('Année de naissance incohérente.'); return }
    await saveProfile({ id: profileId, displayName: displayName.trim(), heightCm: height, birthYear: year, experienceLevel: level, trainingPreferences: preferencesText })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function onAddGoal(e: FormEvent) {
    e.preventDefault()
    await addGoal(goalType, goalText.trim() || GOAL_LABELS[goalType])
    setGoalText('')
  }

  async function onExport() {
    const json = await exportAllData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gym-os-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageTitle title="Profil et paramètres" subtitle="Tes informations restent sur ton appareil (et dans ton Supabase quand il sera configuré)." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 font-bold"><User size={18} /> Profil sportif</h2>
          <form onSubmit={onSaveProfile} className="space-y-3">
            <div>
              <label className={labelCls} htmlFor="name">Nom ou pseudonyme *</label>
              <input id="name" className={inputCls} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ex. Alex" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="height">Taille (cm)</label>
                <input id="height" className={inputCls} inputMode="numeric" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="178" />
              </div>
              <div>
                <label className={labelCls} htmlFor="year">Année de naissance</label>
                <input id="year" className={inputCls} inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="1998" />
              </div>
            </div>
            <div>
              <label className={labelCls} htmlFor="level">Niveau sportif</label>
              <select id="level" className={inputCls} value={level} onChange={(e) => setLevel(e.target.value as ExperienceLevel)}>
                <option value="debutant">Débutant</option>
                <option value="intermediaire">Intermédiaire</option>
                <option value="avance">Avancé</option>
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="pref">Préférences et contraintes</label>
              <textarea id="pref" className={inputCls} rows={3} value={preferencesText} onChange={(e) => setPreferencesText(e.target.value)} placeholder="Ex. 4 jours/semaine, salle complète, éviter le squat lourd, préférer les haltères…" />
            </div>
            {error ? <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-bold text-accent-ink transition hover:brightness-110">
              <Save size={17} /> {saved ? 'Enregistré ✓' : 'Enregistrer le profil'}
            </button>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 flex items-center gap-2 font-bold"><Target size={18} /> Mes objectifs</h2>
            {goals && goals.length > 0 ? (
              <ul className="mb-4 space-y-2">
                {goals.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface2/60 px-3 py-2.5 text-sm">
                    <span><strong>{GOAL_LABELS[g.goalType]}</strong>{g.description !== GOAL_LABELS[g.goalType] ? ` — ${g.description}` : ''} <span className="text-muted">(priorité {g.priority})</span></span>
                    <button onClick={() => deleteGoal(g.id)} aria-label={`Supprimer l’objectif ${g.description}`} className="text-muted transition hover:text-danger"><Trash2 size={16} /></button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-muted">Aucun objectif défini. Choisis-en un pour que tes programmes et statistiques aient un cap.</p>
            )}
            <form onSubmit={onAddGoal} className="flex flex-col gap-2 sm:flex-row">
              <select className={inputCls} value={goalType} onChange={(e) => setGoalType(e.target.value as GoalType)} aria-label="Type d’objectif">
                {Object.entries(GOAL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input className={inputCls} value={goalText} onChange={(e) => setGoalText(e.target.value)} placeholder="Précision (facultatif)" aria-label="Précision sur l’objectif" />
              <button type="submit" className="shrink-0 rounded-xl border border-line bg-surface2 px-4 py-2.5 text-sm font-semibold transition hover:border-accent/50">Ajouter</button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-3 font-bold">Préférences d’entraînement</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="rest">Repos par défaut (secondes)</label>
                <input id="rest" className={inputCls} type="number" min={0} max={3600} value={rest} onChange={(e) => setRest(Number(e.target.value))} />
              </div>
              <div>
                <label className={labelCls} htmlFor="unit">Unité de charge</label>
                <select id="unit" className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value as 'kg' | 'lb')}>
                  <option value="kg">Kilogrammes (kg)</option>
                  <option value="lb">Livres (lb)</option>
                </select>
              </div>
            </div>
            <button
              onClick={async () => { if (prefs) await savePreferences({ ...prefs, defaultRestSeconds: rest, unitSystem: unit }) }}
              className="mt-3 rounded-xl border border-line bg-surface2 px-4 py-2.5 text-sm font-semibold transition hover:border-accent/50"
            >
              Enregistrer les préférences
            </button>
          </Card>

          <Card>
            <h2 className="mb-1 font-bold">Mes données</h2>
            <p className="mb-3 text-sm text-muted">Tu restes propriétaire de tes données : exporte-les à tout moment en JSON. L’import et la synchronisation cloud arrivent en Phase 7.</p>
            <button onClick={onExport} className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface2 px-4 py-2.5 text-sm font-semibold transition hover:border-accent/50">
              <Download size={16} /> Exporter mes données (JSON)
            </button>
          </Card>
        </div>
      </div>
    </div>
  )
}
