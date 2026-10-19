import { useState, type FormEvent } from 'react'
import { Check, X } from 'lucide-react'
import type { Exercise, MuscleGroup, MuscleRole } from '../domain/types'
import type { CustomExerciseInput } from '../services/exerciseService'
import { Card } from '../components/ui'

const fieldClass = 'min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-blue-100'
type InitialExercise = Exercise & { muscles: Array<{ muscleGroupId: string; role: MuscleRole }> }

export function CustomExerciseForm({ groups, initial, busy, onCancel, onSave }: {
  groups: MuscleGroup[]
  initial?: InitialExercise
  busy: boolean
  onCancel: () => void
  onSave: (input: CustomExerciseInput) => Promise<void>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [alternativeNames, setAlternativeNames] = useState(initial?.alternativeNames ?? '')
  const [equipment, setEquipment] = useState(initial?.equipment ?? 'autre')
  const [movementType, setMovementType] = useState(initial?.movementType ?? 'autre')
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(initial?.difficulty ?? 1)
  const [description, setDescription] = useState(initial?.description ?? '')
  const [instructions, setInstructions] = useState(initial?.instructions ?? '')
  const [commonMistakes, setCommonMistakes] = useState(initial?.commonMistakes ?? '')
  const [muscles, setMuscles] = useState<Record<string, MuscleRole>>(Object.fromEntries(initial?.muscles.map(muscle => [muscle.muscleGroupId, muscle.role]) ?? []))
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    const selectedMuscles = Object.entries(muscles).map(([muscleGroupId, role]) => ({ muscleGroupId, role }))
    try { await onSave({ id: initial?.id, name, alternativeNames, equipment, movementType, difficulty, description, instructions, commonMistakes, muscles: selectedMuscles }) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'L’exercice n’a pas pu être enregistré.') }
  }

  return <Card><div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-ink">{initial ? 'Modifier l’exercice personnalisé' : 'Créer un exercice personnalisé'}</h2><p className="mt-1 text-sm text-muted">Les exercices intégrés à la bibliothèque ne sont pas modifiables.</p></div><button type="button" onClick={onCancel} aria-label="Fermer le formulaire" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line"><X size={18} /></button></div>
    <form onSubmit={submit} noValidate className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1 block text-xs font-semibold text-muted">Nom *</span><input className={fieldClass} maxLength={80} value={name} onChange={event => setName(event.target.value)} required /></label><label><span className="mb-1 block text-xs font-semibold text-muted">Autres noms (facultatif)</span><input className={fieldClass} maxLength={160} value={alternativeNames} onChange={event => setAlternativeNames(event.target.value)} /></label></div>
      <div className="grid gap-3 sm:grid-cols-3"><label><span className="mb-1 block text-xs font-semibold text-muted">Équipement</span><select className={fieldClass} value={equipment} onChange={event => setEquipment(event.target.value)}><option value="barre">Barre</option><option value="halteres">Haltères</option><option value="machine">Machine</option><option value="poulie">Poulie</option><option value="poids_du_corps">Poids du corps</option><option value="autre">Autre</option></select></label><label><span className="mb-1 block text-xs font-semibold text-muted">Mouvement</span><select className={fieldClass} value={movementType} onChange={event => setMovementType(event.target.value)}><option value="poussee">Poussée</option><option value="tirage">Tirage</option><option value="jambes">Jambes</option><option value="gainage">Gainage</option><option value="autre">Autre</option></select></label><label><span className="mb-1 block text-xs font-semibold text-muted">Difficulté</span><select className={fieldClass} value={difficulty} onChange={event => setDifficulty(Number(event.target.value) as 1 | 2 | 3)}><option value={1}>1 · Facile</option><option value={2}>2 · Intermédiaire</option><option value={3}>3 · Avancé</option></select></label></div>
      <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Description *</span><textarea className={fieldClass} maxLength={500} rows={2} value={description} onChange={event => setDescription(event.target.value)} required /></label>
      <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Consignes *</span><textarea className={fieldClass} maxLength={2000} rows={3} value={instructions} onChange={event => setInstructions(event.target.value)} required /></label>
      <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Erreurs fréquentes (facultatif)</span><textarea className={fieldClass} maxLength={1000} rows={2} value={commonMistakes} onChange={event => setCommonMistakes(event.target.value)} /></label>
      <fieldset><legend className="mb-2 text-xs font-semibold text-muted">Muscles ciblés · au moins un muscle principal *</legend><div className="grid gap-2 sm:grid-cols-2">{groups.map(group => <div key={group.id} className="flex min-h-11 items-center gap-2 rounded-xl border border-line px-3"><input id={`custom-muscle-${group.id}`} type="checkbox" checked={!!muscles[group.id]} onChange={event => setMuscles(current => { const next = { ...current }; if (event.target.checked) next[group.id] = 'principal'; else delete next[group.id]; return next })} className="h-4 w-4 accent-blue-600" /><label htmlFor={`custom-muscle-${group.id}`} className="min-w-0 flex-1 text-sm font-medium">{group.name}</label>{muscles[group.id] && <select aria-label={`Rôle ${group.name}`} value={muscles[group.id]} onChange={event => setMuscles(current => ({ ...current, [group.id]: event.target.value as MuscleRole }))} className="min-h-9 rounded-lg border border-line bg-surface px-2 text-xs"><option value="principal">Principal</option><option value="secondaire">Secondaire</option></select>}</div>)}</div></fieldset>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end"><button type="button" disabled={busy} onClick={onCancel} className="min-h-11 rounded-xl border border-line px-4 text-sm font-semibold">Annuler</button><button type="submit" disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-white disabled:opacity-50"><Check size={17} />{busy ? 'Enregistrement…' : initial ? 'Enregistrer' : 'Créer l’exercice'}</button></div>
    </form>
  </Card>
}
