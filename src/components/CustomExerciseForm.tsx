import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../services/db'
import { createCustomExercise } from '../services/exerciseService'
import type { MuscleRole } from '../domain/types'

const inputCls = 'w-full rounded-xl border border-line bg-surface2/60 px-3 py-2.5 text-sm outline-none focus:border-accent'
const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-muted'

const EQUIPMENT = ['barre', 'halteres', 'machine', 'poulie', 'poids_du_corps', 'autre']
const EQUIPMENT_LABELS: Record<string, string> = {
  barre: 'Barre', halteres: 'Haltères', machine: 'Machine', poulie: 'Poulie', poids_du_corps: 'Poids du corps', autre: 'Autre',
}
const MOVEMENT = ['poussee', 'tirage', 'jambes', 'gainage', 'cardio', 'autre']
const MOVEMENT_LABELS: Record<string, string> = {
  poussee: 'Poussée', tirage: 'Tirage', jambes: 'Jambes', gainage: 'Gainage', cardio: 'Cardio', autre: 'Autre',
}

/** Création d’un exercice personnel (§5.4) avec ses muscles. */
export default function CustomExerciseForm({ onCreated, onCancel }: {
  onCreated: () => void
  onCancel: () => void
}) {
  const groups = useLiveQuery(() => db.muscleGroups.toArray(), [])
  const [name, setName] = useState('')
  const [equipment, setEquipment] = useState('barre')
  const [movementType, setMovementType] = useState('autre')
  const [difficulty, setDifficulty] = useState<'1' | '2' | '3'>('2')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [commonMistakes, setCommonMistakes] = useState('')
  const [roles, setRoles] = useState<Record<string, MuscleRole | ''>>({})
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const muscles = Object.entries(roles)
      .filter(([, role]) => role !== '')
      .map(([muscleGroupId, role]) => ({ muscleGroupId, role: role as MuscleRole }))
    try {
      await createCustomExercise({
        name, equipment, movementType,
        difficulty: Number(difficulty) as 1 | 2 | 3,
        description, instructions,
        commonMistakes: commonMistakes.trim() ? commonMistakes : undefined,
        muscles,
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer l’exercice.')
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label>
        <span className={labelCls}>Nom *</span>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Développé incliné à la machine" className={inputCls} maxLength={80} required />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className={labelCls}>Matériel</span>
          <select value={equipment} onChange={(e) => setEquipment(e.target.value)} className={inputCls}>
            {EQUIPMENT.map((v) => <option key={v} value={v}>{EQUIPMENT_LABELS[v]}</option>)}
          </select>
        </label>
        <label>
          <span className={labelCls}>Type de mouvement</span>
          <select value={movementType} onChange={(e) => setMovementType(e.target.value)} className={inputCls}>
            {MOVEMENT.map((v) => <option key={v} value={v}>{MOVEMENT_LABELS[v]}</option>)}
          </select>
        </label>
        <label>
          <span className={labelCls}>Difficulté</span>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as '1' | '2' | '3')} className={inputCls}>
            <option value="1">1 — Débutant</option>
            <option value="2">2 — Intermédiaire</option>
            <option value="3">3 — Avancé</option>
          </select>
        </label>
      </div>
      <label>
        <span className={labelCls}>Description</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="De quoi s’agit-il ?" className={inputCls} maxLength={300} />
      </label>
      <label>
        <span className={labelCls}>Consignes d’exécution *</span>
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} placeholder="Décrire la technique, étape par étape…" className={inputCls} maxLength={600} required />
      </label>
      <label>
        <span className={labelCls}>Erreurs fréquentes (facultatif)</span>
        <input value={commonMistakes} onChange={(e) => setCommonMistakes(e.target.value)} className={inputCls} maxLength={200} />
      </label>
      <div>
        <span className={labelCls}>Groupes musculaires (au moins un principal) *</span>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {(groups ?? []).map((g) => (
            <label key={g.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface2/40 px-3 py-2 text-sm">
              {g.name}
              <select
                value={roles[g.id] ?? ''}
                onChange={(e) => setRoles((r) => ({ ...r, [g.id]: e.target.value as MuscleRole | '' }))}
                className="rounded-lg border border-line bg-surface px-2 py-1 text-xs outline-none focus:border-accent"
              >
                <option value="">—</option>
                <option value="principal">Principal</option>
                <option value="secondaire">Secondaire</option>
              </select>
            </label>
          ))}
        </div>
      </div>
      {error ? <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-ink">Annuler</button>
        <button type="submit" className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-ink transition hover:brightness-110">Créer l’exercice</button>
      </div>
    </form>
  )
}
