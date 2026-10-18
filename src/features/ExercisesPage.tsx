import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Library, Plus, Search, Trash2 } from 'lucide-react'
import { db } from '../services/db'
import { deleteCustomExercise } from '../services/exerciseService'
import { EmptyState, PageTitle } from '../components/ui'
import Modal from '../components/Modal'
import CustomExerciseForm from '../components/CustomExerciseForm'

const EQUIPMENT_LABELS: Record<string, string> = {
  barre: 'Barre', halteres: 'Haltères', machine: 'Machine', poulie: 'Poulie', poids_du_corps: 'Poids du corps', autre: 'Autre',
}

export default function ExercisesPage() {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<string>('tous')
  const [equipment, setEquipment] = useState<string>('tous')
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const data = useLiveQuery(async () => {
    const [exercises, groups, links] = await Promise.all([
      db.exercises.orderBy('name').toArray(),
      db.muscleGroups.toArray(),
      db.exerciseMuscles.toArray(),
    ])
    return { exercises, groups, links }
  }, [])

  const musclesOf = useMemo(() => {
    const map = new Map<string, Array<{ name: string; role: string }>>()
    if (!data) return map
    for (const link of data.links) {
      const group = data.groups.find((g) => g.id === link.muscleGroupId)
      if (!group) continue
      const list = map.get(link.exerciseId) ?? []
      list.push({ name: group.name, role: link.role })
      map.set(link.exerciseId, list)
    }
    return map
  }, [data])

  const filtered = (data?.exercises ?? []).filter((e) => {
    const matchesQuery = e.name.toLowerCase().includes(query.trim().toLowerCase())
    const matchesMuscle = muscle === 'tous' || (musclesOf.get(e.id) ?? []).some((m) => {
      const group = data?.groups.find((g) => g.name === m.name)
      return group?.id === muscle
    })
    const matchesEquipment = equipment === 'tous' || e.equipment === equipment
    return matchesQuery && matchesMuscle && matchesEquipment
  })

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <PageTitle title="Bibliothèque d’exercices" subtitle="Recherche, filtres, fiches techniques et exercices personnalisés." />
        <button
          onClick={() => setCreating(true)}
          className="mb-5 ml-auto inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink transition hover:brightness-110"
        >
          <Plus size={17} /> Exercice perso
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <span className="sr-only">Rechercher un exercice</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (ex. développé, rowing, squat…)"
            className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-3 text-sm outline-none placeholder:text-muted/70 focus:border-accent"
          />
        </label>
        <label>
          <span className="sr-only">Filtrer par groupe musculaire</span>
          <select
            value={muscle}
            onChange={(e) => setMuscle(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-3 py-3 text-sm outline-none focus:border-accent sm:w-48"
          >
            <option value="tous">Tous les muscles</option>
            {(data?.groups ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Filtrer par matériel</span>
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-3 py-3 text-sm outline-none focus:border-accent sm:w-44"
          >
            <option value="tous">Tout matériel</option>
            {Object.entries(EQUIPMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Library size={28} />} title="Aucun exercice trouvé" message="Essaie un autre mot-clé ou un autre groupe musculaire." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <Link
              key={e.id}
              to={`/exercices/${e.id}`}
              className="block rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-accent/40"
            >
              <h2 className="font-semibold leading-snug">{e.name}</h2>
              <p className="mt-1 text-xs text-muted">{EQUIPMENT_LABELS[e.equipment] ?? e.equipment} · Difficulté {e.difficulty}/3 {e.isCustom ? '· Personnalisé' : ''}</p>
              {e.isCustom ? (
                <button
                  onClick={(ev) => { ev.stopPropagation(); setConfirmDelete(e.id) }}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11px] font-semibold text-muted transition hover:border-danger/50 hover:text-danger"
                  aria-label={`Supprimer ${e.name}`}
                >
                  <Trash2 size={12} /> Supprimer
                </button>
              ) : null}
              <p className="mt-2 flex flex-wrap gap-1.5">
                {(musclesOf.get(e.id) ?? []).map((m) => (
                  <span key={m.name + m.role} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${m.role === 'principal' ? 'bg-accent/20 text-accent' : 'bg-surface2 text-muted'}`}>{m.name}</span>
                ))}
              </p>
            </Link>
          ))}
        </div>
      )}

      {creating ? (
        <Modal title="Nouvel exercice personnalisé" onClose={() => setCreating(false)} wide>
          <CustomExerciseForm onCreated={() => setCreating(false)} onCancel={() => setCreating(false)} />
        </Modal>
      ) : null}

      {confirmDelete ? (
        <Modal title="Supprimer cet exercice ?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-muted">
            L’exercice personnalisé sera retiré de ta bibliothèque.
            Les programmes qui le contiennent devront être mis à jour ;
            <strong className="text-ink"> tes séances passées restent intactes</strong> (snapshot du nom, §6.3).
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setConfirmDelete(null)} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-ink">Annuler</button>
            <button
              onClick={async () => { await deleteCustomExercise(confirmDelete); setConfirmDelete(null) }}
              className="rounded-xl bg-danger px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
            >
              Supprimer
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
