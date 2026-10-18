import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Library, Search } from 'lucide-react'
import { db } from '../services/db'
import { Card, EmptyState, PageTitle, PhaseBadge } from '../components/ui'

const EQUIPMENT_LABELS: Record<string, string> = {
  barre: 'Barre', halteres: 'Haltères', machine: 'Machine', poulie: 'Poulie', poids_du_corps: 'Poids du corps',
}

export default function ExercisesPage() {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<string>('tous')
  const [filtersUsed, setFiltersUsed] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

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
    return matchesQuery && matchesMuscle
  })

  const selected = data?.exercises.find((e) => e.id === selectedId)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <PageTitle title="Bibliothèque d’exercices" subtitle="Recherche, filtres et fiches techniques. L’ajout d’exercices personnalisés arrive en Phase 3." />
        <span className="mb-5 ml-auto"><PhaseBadge phase="Phase 3 — en cours" /></span>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <span className="sr-only">Rechercher un exercice</span>
          <input
            value={query}
            onChange={(e) => { setFiltersUsed(true); setQuery(e.target.value) }}
            placeholder="Rechercher (ex. développé, rowing, squat…)"
            className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-3 text-sm outline-none placeholder:text-muted/70 focus:border-accent"
          />
        </label>
        <label>
          <span className="sr-only">Filtrer par groupe musculaire</span>
          <select
            value={muscle}
            onChange={(e) => { setFiltersUsed(true); setMuscle(e.target.value) }}
            className="w-full rounded-xl border border-line bg-surface px-3 py-3 text-sm outline-none focus:border-accent sm:w-56"
          >
            <option value="tous">Tous les muscles</option>
            {(data?.groups ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Library size={28} />} title="Aucun exercice trouvé" message="Essaie un autre mot-clé ou un autre groupe musculaire." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelectedId(selectedId === e.id ? null : e.id)}
              className={`gym-interactive-card ${filtersUsed ? 'gym-list-item-enter' : ''} rounded-2xl border p-4 text-left ${selectedId === e.id ? 'border-accent bg-surface2' : 'border-line bg-surface hover:border-accent/40'}`}
              aria-expanded={selectedId === e.id}
            >
              <h2 className="font-semibold leading-snug">{e.name}</h2>
              <p className="mt-1 text-xs text-muted">{EQUIPMENT_LABELS[e.equipment] ?? e.equipment} · Difficulté {e.difficulty}/3 {e.isCustom ? '· Personnalisé' : ''}</p>
              <p className="mt-2 flex flex-wrap gap-1.5">
                {(musclesOf.get(e.id) ?? []).map((m) => (
                  <span key={m.name + m.role} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${m.role === 'principal' ? 'bg-accent/20 text-accent' : 'bg-surface2 text-muted'}`}>{m.name}</span>
                ))}
              </p>
            </button>
          ))}
        </div>
      )}

      {selected ? (
        <Card className="gym-panel-enter mt-5">
          <h2 className="text-lg font-bold">{selected.name}</h2>
          <p className="mt-1 text-sm text-muted">{selected.description}</p>
          <h3 className="mt-4 text-sm font-bold uppercase tracking-wide text-muted">Consignes d’exécution</h3>
          <p className="mt-1 text-sm">{selected.instructions}</p>
          {selected.commonMistakes ? (
            <>
              <h3 className="mt-4 text-sm font-bold uppercase tracking-wide text-muted">Erreurs fréquentes</h3>
              <p className="mt-1 text-sm">{selected.commonMistakes}</p>
            </>
          ) : null}
          <p className="mt-4 text-xs text-muted">L’historique de tes performances sur cet exercice apparaîtra ici après tes premières séances (Phase 5).</p>
        </Card>
      ) : null}
    </div>
  )
}
