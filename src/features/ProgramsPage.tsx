import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, CalendarDays, ChevronRight, Pause, Play, Plus, Trash2 } from 'lucide-react'
import { createProgram, deleteProgram, listPrograms, setProgramStatus } from '../services/programService'
import { Card, EmptyState, PageTitle } from '../components/ui'
import Modal from '../components/Modal'
import { validateProgramInput } from '../domain/programs'
import type { ProgramStatus } from '../domain/types'

const STATUS_LABEL: Record<ProgramStatus, { label: string; cls: string }> = {
  actif: { label: 'Actif', cls: 'bg-success/15 text-success' },
  pause: { label: 'En pause', cls: 'bg-warning/15 text-warning' },
  archive: { label: 'Archivé', cls: 'bg-surface2 text-muted' },
}

export default function ProgramsPage() {
  const navigate = useNavigate()
  const programs = useLiveQuery(() => listPrograms(), [])
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [objective, setObjective] = useState('')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setError('')
    const v = validateProgramInput({ name, objective })
    if (!v.ok) { setError(v.errors[0]); return }
    const program = await createProgram({ name, objective })
    setCreating(false)
    setName('')
    setObjective('')
    navigate(`/programme/${program.id}`)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <PageTitle title="Programmes" subtitle="Organise tes jours d’entraînement : exercices, séries, répétitions, charges cibles et repos." />
        <button
          onClick={() => setCreating(true)}
          className="mb-5 ml-auto inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink transition hover:brightness-110"
        >
          <Plus size={17} /> Nouveau programme
        </button>
      </div>

      {!programs || programs.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={28} />}
          title="Aucun programme pour le moment"
          message="Crée ton premier programme : par exemple « Poussée haut du corps », « Dos & Biceps » ou « Jambes ». Chaque jour contient des exercices avec tes séries, répétitions, charges et temps de repos cibles."
          action={{ label: 'Créer mon programme', to: '/programme' }}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {programs.map((p) => {
            const status = STATUS_LABEL[p.status]
            return (
              <Card key={p.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold">{p.name}</h2>
                    {p.objective ? <p className="mt-0.5 text-sm text-muted">{p.objective}</p> : null}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${status.cls}`}>{status.label}</span>
                </div>
                <p className="text-xs text-muted">
                  {p.days} jour{p.days > 1 ? 's' : ''} · {p.exercises} exercice{p.exercises > 1 ? 's' : ''} planifié{p.exercises > 1 ? 's' : ''}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <Link
                    to={`/programme/${p.id}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-surface2 px-4 py-2.5 text-sm font-semibold transition hover:border hover:border-accent/50"
                  >
                    Ouvrir <ChevronRight size={15} />
                  </Link>
                  {p.status === 'actif' ? (
                    <button onClick={() => setProgramStatus(p.id, 'pause')} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2.5 text-sm text-muted transition hover:text-ink" title="Mettre en pause">
                      <Pause size={15} /> Pause
                    </button>
                  ) : (
                    <button onClick={() => setProgramStatus(p.id, 'actif')} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2.5 text-sm text-muted transition hover:text-ink" title="Réactiver">
                      <Play size={15} /> Réactiver
                    </button>
                  )}
                  <button onClick={() => setConfirmDelete(p.id)} className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2.5 text-sm text-danger transition hover:bg-danger/10" title="Supprimer le programme">
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <div className="mt-5">
        <Card>
          <h2 className="mb-1 flex items-center gap-2 font-bold"><Archive size={17} /> Programmes archivés</h2>
          <p className="text-sm text-muted">
            {programs?.filter((p) => p.status === 'archive').length ?? 0} programme(s) archivé(s).
            Les séances déjà réalisées restent toujours disponibles dans l’historique, même si un programme est supprimé (§17.2).
          </p>
        </Card>
      </div>

      {creating ? (
        <Modal title="Nouveau programme" onClose={() => setCreating(false)}>
          <form onSubmit={onCreate} className="flex flex-col gap-4">
            <label>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Nom</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Poussée / Tirage / Jambes, Upper/Lower…"
                className="w-full rounded-xl border border-line bg-surface2/60 px-3 py-2.5 text-sm outline-none focus:border-accent"
                maxLength={60}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Objectif (facultatif)</span>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Ex. Prendre du volume sur les pectoraux, préparer une compétition…"
                rows={3}
                className="w-full rounded-xl border border-line bg-surface2/60 px-3 py-2.5 text-sm outline-none focus:border-accent"
                maxLength={280}
              />
            </label>
            {error ? <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCreating(false)} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-ink">Annuler</button>
              <button type="submit" className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-ink transition hover:brightness-110">Créer le programme</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {confirmDelete ? (
        <Modal title="Supprimer ce programme ?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-muted">
            Le programme et ses jours seront supprimés. <strong className="text-ink">Aucune séance déjà réalisée ne sera effacée</strong> — l’historique est préservé (§17.2).
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setConfirmDelete(null)} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-ink">Annuler</button>
            <button
              disabled={deleting}
              onClick={async () => {
                setDeleting(true)
                await deleteProgram(confirmDelete)
                setConfirmDelete(null)
                setDeleting(false)
              }}
              className="rounded-xl bg-danger px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {deleting ? 'Suppression…' : 'Supprimer le programme'}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
