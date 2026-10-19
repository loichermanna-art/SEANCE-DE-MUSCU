import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Library, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { db } from '../services/db'
import { Card, EmptyState, PageTitle, PhaseBadge } from '../components/ui'
import ExerciseDemoPlayer from './ExerciseDemoPlayer'
import { historyService, type ExerciseProgress } from '../services/historyService'
import { exerciseService, type CustomExerciseInput } from '../services/exerciseService'
import type { Exercise } from '../domain/types'
import { CustomExerciseForm } from './CustomExerciseForm'

const EQUIPMENT_LABELS: Record<string, string> = {
  barre: 'Barre', halteres: 'Haltères', machine: 'Machine', poulie: 'Poulie', poids_du_corps: 'Poids du corps',
}

export default function ExercisesPage() {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<string>('tous')
  const [equipment, setEquipment] = useState<string>('tous')
  const [filtersUsed, setFiltersUsed] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress>()
  const [progressLoading, setProgressLoading] = useState(false)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [editingCustom, setEditingCustom] = useState<Exercise | undefined>()
  const [customBusy, setCustomBusy] = useState(false)
  const [customNotice, setCustomNotice] = useState('')
  const [customError, setCustomError] = useState('')

  const data = useLiveQuery(async () => {
    const [exercises, groups, links, demonstrations] = await Promise.all([
      db.exercises.orderBy('name').toArray(),
      db.muscleGroups.toArray(),
      db.exerciseMuscles.toArray(),
      db.exerciseDemonstrations.where('status').equals('publiee').toArray(),
    ])
    return { exercises, groups, links, demonstrations }
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
    const searchText = `${e.name} ${e.alternativeNames ?? ''}`.toLocaleLowerCase('fr')
    const matchesQuery = searchText.includes(query.trim().toLocaleLowerCase('fr'))
    const matchesMuscle = muscle === 'tous' || (musclesOf.get(e.id) ?? []).some((m) => {
      const group = data?.groups.find((g) => g.name === m.name)
      return group?.id === muscle
    })
    const matchesEquipment = equipment === 'tous' || e.equipment === equipment
    return matchesQuery && matchesMuscle && matchesEquipment
  })

  const selected = data?.exercises.find((e) => e.id === selectedId)

  useEffect(() => {
    if (!selectedId) { setExerciseProgress(undefined); return }
    let active = true
    setProgressLoading(true)
    void historyService.getExerciseProgress(selectedId).then(progress => { if (active) setExerciseProgress(progress) })
      .finally(() => { if (active) setProgressLoading(false) })
    return () => { active = false }
  }, [selectedId])

  async function saveCustom(input: CustomExerciseInput) {
    setCustomBusy(true); setCustomError('')
    try {
      const savedExercise = await exerciseService.saveCustom(input)
      setSelectedId(savedExercise.id); setEditingCustom(undefined); setShowCustomForm(false)
      setCustomNotice(input.id ? 'Exercice personnalisé mis à jour.' : 'Exercice personnalisé créé.')
    } catch (cause) { setCustomError(cause instanceof Error ? cause.message : 'Impossible d’enregistrer cet exercice.'); throw cause }
    finally { setCustomBusy(false) }
  }

  async function deleteCustom(exercise: Exercise) {
    if (!window.confirm(`Supprimer « ${exercise.name} » de ta bibliothèque ?`)) return
    setCustomBusy(true); setCustomError(''); setCustomNotice('')
    try {
      await exerciseService.deleteCustom(exercise.id)
      setSelectedId(null); setCustomNotice('Exercice supprimé. Les noms instantanés de l’historique sont conservés.')
    } catch (cause) { setCustomError(cause instanceof Error ? cause.message : 'Impossible de supprimer cet exercice.') }
    finally { setCustomBusy(false) }
  }

  const editingForm = editingCustom ? {
    ...editingCustom,
    muscles: (data?.links ?? []).filter(link => link.exerciseId === editingCustom.id).map(link => ({ muscleGroupId: link.muscleGroupId, role: link.role })),
  } : undefined

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <PageTitle title="Bibliothèque d’exercices" subtitle="Recherche par nom ou alias, filtres musculaires, démonstrations et fiches techniques." />
        <div className="mb-5 ml-auto flex flex-wrap gap-2"><PhaseBadge phase="Bibliothèque" /><button onClick={() => { setShowCustomForm(true); setEditingCustom(undefined); setCustomError('') }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-3 text-sm font-semibold text-white"><Plus size={17} /> Créer un exercice</button></div>
      </div>
      {customNotice && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{customNotice}</p>}
      {customError && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{customError}</p>}
      {(showCustomForm || editingCustom) && data && <div className="mb-5"><CustomExerciseForm groups={data.groups} initial={editingForm} busy={customBusy} onCancel={() => { setShowCustomForm(false); setEditingCustom(undefined); setCustomError('') }} onSave={saveCustom} /></div>}

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
        <label>
          <span className="sr-only">Filtrer par équipement</span>
          <select value={equipment} onChange={event => { setFiltersUsed(true); setEquipment(event.target.value) }} className="w-full rounded-xl border border-line bg-surface px-3 py-3 text-sm outline-none focus:border-accent sm:w-48">
            <option value="tous">Tous les équipements</option>{Object.entries(EQUIPMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      {!data ? <Card><p role="status" className="py-6 text-sm text-muted">Chargement de la bibliothèque…</p></Card> : filtered.length === 0 ? (
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
        <div className="gym-panel-enter mt-5 space-y-4">
          {data?.demonstrations.find((demo) => demo.exerciseId === selected.id) ? (
            <ExerciseDemoPlayer demonstration={data.demonstrations.find((demo) => demo.exerciseId === selected.id)!} />
          ) : null}
          <Card>
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
          {selected.isCustom && <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3"><button onClick={() => { setEditingCustom(selected); setShowCustomForm(false); setCustomError('') }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold"><Pencil size={16} /> Modifier mon exercice</button><button disabled={customBusy} onClick={() => void deleteCustom(selected)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-700 disabled:opacity-50"><Trash2 size={16} /> Supprimer</button></div>}
          <section className="mt-5 border-t border-line pt-4" aria-label="Historique de l’exercice"><h3 className="text-sm font-bold uppercase tracking-wide text-muted">Performances enregistrées</h3>{progressLoading ? <p role="status" className="mt-2 text-sm text-muted">Chargement de l’historique…</p> : exerciseProgress?.points.length ? <><p className="mt-2 text-sm text-ink">Record actuel : {exerciseProgress.records.bestLoad === null ? 'aucune charge externe enregistrée' : `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(exerciseProgress.records.bestLoad)} kg`} · {exerciseProgress.records.bestReps ?? '—'} répétitions max.</p><ul className="mt-2 divide-y divide-line">{exerciseProgress.points.slice(-5).reverse().map(point => <li key={point.sessionId} className="flex flex-wrap justify-between gap-2 py-2 text-xs"><span className="font-medium text-ink">{new Date(point.date).toLocaleDateString('fr-FR')} · {point.name}</span><span className="text-muted">{point.bestLoad === null ? 'poids du corps' : `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(point.bestLoad)} kg`} · {point.workSets} séries</span></li>)}</ul></> : <p className="mt-2 text-sm text-muted">Aucune séance terminée pour cet exercice. Les données apparaîtront après avoir enregistré une séance réelle.</p>}</section>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
