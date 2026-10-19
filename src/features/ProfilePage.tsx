import { useEffect, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Download, Save, Target, Trash2, Upload, User } from 'lucide-react'
import { addGoal, deleteGoal, exportAllData, getPreferences, getProfile, listGoals, savePreferences, saveProfile } from '../services/profileService'
import { importAllData } from '../services/backupService'
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
  const [backupMode, setBackupMode] = useState<'merge' | 'replace'>('merge')
  const [backupBusy, setBackupBusy] = useState(false)
  const [backupMessage, setBackupMessage] = useState('')
  const [backupError, setBackupError] = useState('')

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
    setBackupError(''); setBackupMessage('')
    try {
      const json = await exportAllData()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gym-os-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setBackupMessage('Sauvegarde téléchargée. Garde ce fichier dans un emplacement sûr.')
    } catch (cause) { setBackupError(cause instanceof Error ? cause.message : 'Impossible de créer la sauvegarde.') }
  }

  async function onImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const file = (form.elements.namedItem('backup-file') as HTMLInputElement | null)?.files?.[0]
    if (!file) { setBackupError('Choisis un fichier JSON de sauvegarde.'); return }
    if (backupMode === 'replace' && !window.confirm('Remplacer toutes les données locales par cette sauvegarde ? Les données actuelles seront supprimées si le fichier est valide.')) return
    setBackupBusy(true); setBackupError(''); setBackupMessage('')
    try {
      const counts = await importAllData(await file.text(), backupMode)
      const profile = await getProfile()
      if (profile) { setProfileId(profile.id); setDisplayName(profile.displayName); setHeightCm(profile.heightCm ? String(profile.heightCm) : ''); setBirthYear(profile.birthYear ? String(profile.birthYear) : ''); setLevel(profile.experienceLevel); setPreferencesText(profile.trainingPreferences) }
      setBackupMessage(`Import ${backupMode === 'merge' ? 'fusionné' : 'restauré'} : ${counts.programs} programme(s), ${counts.workoutSessions} séance(s), ${counts.recoveryCheckins} bilan(s).`)
      form.reset()
    } catch (cause) { setBackupError(cause instanceof Error ? cause.message : 'La sauvegarde n’a pas pu être importée.') }
    finally { setBackupBusy(false) }
  }

  return (
    <div>
      <PageTitle title="Profil et paramètres" subtitle="Ton profil est enregistré localement sur cet appareil; la synchronisation cloud n’est pas activée." />

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
            <button type="submit" className="gym-action inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-bold text-accent-ink hover:brightness-110">
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
                    <button onClick={() => deleteGoal(g.id)} aria-label={`Supprimer l’objectif ${g.description}`} className="gym-action text-muted hover:text-danger"><Trash2 size={16} /></button>
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
              <button type="submit" className="gym-action shrink-0 rounded-xl border border-line bg-surface2 px-4 py-2.5 text-sm font-semibold hover:border-accent/50">Ajouter</button>
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
              className="gym-action mt-3 rounded-xl border border-line bg-surface2 px-4 py-2.5 text-sm font-semibold hover:border-accent/50"
            >
              Enregistrer les préférences
            </button>
          </Card>

          <Card>
            <h2 className="mb-1 font-bold">Mes données</h2>
            <p className="mb-3 text-sm text-muted">Tes données restent sur cet appareil. Sauvegarde ou restaure tes programmes, séances, bilans, préférences et exercices personnalisés depuis un fichier JSON.</p>
            <button type="button" onClick={() => void onExport()} disabled={backupBusy} className="gym-action inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface2 px-4 py-2.5 text-sm font-semibold hover:border-accent/50 disabled:opacity-50">
              <Download size={16} /> Exporter mes données (JSON)
            </button>
            <form onSubmit={event => void onImport(event)} className="mt-4 space-y-3 border-t border-line pt-4">
              <label className="block"><span className={labelCls}>Importer une sauvegarde</span><input name="backup-file" type="file" accept="application/json,.json" className="block min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surface2 file:px-3 file:py-2 file:font-semibold" /></label>
              <label className="block"><span className={labelCls}>Mode d’import</span><select value={backupMode} onChange={event => setBackupMode(event.target.value as 'merge' | 'replace')} className={inputCls}><option value="merge">Fusionner (recommandé; mêmes identifiants mis à jour)</option><option value="replace">Remplacer toutes mes données locales</option></select></label>
              {backupMode === 'replace' && <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs leading-5 text-amber-900">Le remplacement supprime d’abord les données personnelles locales, puis restaure le contenu du fichier. Une confirmation sera demandée.</p>}
              {backupError && <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-sm text-red-800">{backupError}</p>}
              {backupMessage && <p role="status" className="rounded-lg bg-emerald-50 p-2.5 text-sm text-emerald-800">{backupMessage}</p>}
              <button type="submit" disabled={backupBusy} className="gym-action inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 font-semibold text-white disabled:opacity-50"><Upload size={16} />{backupBusy ? 'Vérification et import…' : 'Importer la sauvegarde'}</button>
            </form>
            <p className="mt-3 text-xs leading-5 text-muted">La synchronisation cloud reste désactivée tant qu’une authentification et des règles RLS sûres ne sont pas configurées.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
