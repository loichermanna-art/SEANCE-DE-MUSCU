import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, Archive, CalendarDays, Check, ChevronRight, CirclePause, CirclePlay, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { Card, EmptyState, PageTitle } from '../components/ui'
import type { Program, ProgramDay, ProgramStatus } from '../domain/types'
import { programService, type ProgramDayInput, type ProgramInput } from '../services/programService'

type ProgramWithCount = Program & { daysCount: number }
type Notice = { kind: 'success' | 'error'; text: string }

const statusLabels: Record<ProgramStatus, string> = { actif: 'Actif', pause: 'En pause', archive: 'Archivé' }
const statusStyles: Record<ProgramStatus, string> = {
  actif: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  pause: 'border-amber-200 bg-amber-50 text-amber-800',
  archive: 'border-slate-200 bg-slate-100 text-slate-600',
}
const weekdays = [{ value: '', label: 'Aucun' }, ...['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((label, index) => ({ value: String(index + 1), label }))]

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue. Réessaie.'
}

function StatusBadge({ status }: { status: ProgramStatus }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}>{statusLabels[status]}</span>
}

function ProgramForm({ initial, busy, onCancel, onSave }: {
  initial?: Program
  busy: boolean
  onCancel: () => void
  onSave: (input: ProgramInput) => Promise<void>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [objective, setObjective] = useState(initial?.objective ?? '')
  const [status, setStatus] = useState<ProgramStatus>(initial?.status ?? 'actif')
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) { setError('Le nom du programme est obligatoire.'); return }
    if (name.trim().length > 80 || objective.trim().length > 240) { setError('Le nom est limité à 80 caractères et l’objectif à 240.'); return }
    setError('')
    try { await onSave({ name, objective, status }) } catch (e) { setError(errorMessage(e)) }
  }
  return <form onSubmit={submit} className="space-y-4" noValidate>
    <div><label htmlFor="program-name" className="mb-1.5 block text-sm font-semibold text-ink">Nom du programme <span className="text-red-600">*</span></label><input id="program-name" data-dialog-autofocus maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="Ex. Prise de masse — 4 jours" className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-blue-100" aria-invalid={!!error && !name.trim()} /><p className="mt-1 text-right text-xs text-muted">{name.length}/80</p></div>
    <div><label htmlFor="program-objective" className="mb-1.5 block text-sm font-semibold text-ink">Objectif (facultatif)</label><textarea id="program-objective" maxLength={240} rows={3} value={objective} onChange={e => setObjective(e.target.value)} placeholder="Ex. Développer la force et la masse musculaire" className="w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-blue-100" /><p className="mt-1 text-right text-xs text-muted">{objective.length}/240</p></div>
    <div><label htmlFor="program-status" className="mb-1.5 block text-sm font-semibold text-ink">Statut</label><select id="program-status" value={status} onChange={e => setStatus(e.target.value as ProgramStatus)} className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-blue-100">{(['actif', 'pause', 'archive'] as ProgramStatus[]).map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} disabled={busy} className="min-h-11 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-50">Annuler</button><button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy ? 'Enregistrement…' : initial ? 'Enregistrer les modifications' : 'Créer le programme'}</button></div>
  </form>
}

function DayForm({ initial, busy, onCancel, onSave }: {
  initial?: ProgramDay
  busy: boolean
  onCancel: () => void
  onSave: (input: ProgramDayInput) => Promise<void>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [weekday, setWeekday] = useState(initial?.scheduledWeekday ? String(initial.scheduledWeekday) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) { setError('Le nom du jour est obligatoire.'); return }
    if (name.trim().length > 60 || notes.trim().length > 500) { setError('Le nom est limité à 60 caractères et la note à 500.'); return }
    setError('')
    try { await onSave({ name, scheduledWeekday: weekday ? Number(weekday) : undefined, notes }) } catch (e) { setError(errorMessage(e)) }
  }
  return <form onSubmit={submit} className="space-y-4" noValidate>
    <div><label htmlFor="day-name" className="mb-1.5 block text-sm font-semibold text-ink">Nom du jour <span className="text-red-600">*</span></label><input id="day-name" data-dialog-autofocus maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="Ex. Pectoraux / Triceps" className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-blue-100" /><p className="mt-1 text-right text-xs text-muted">{name.length}/60</p></div>
    <div><label htmlFor="day-weekday" className="mb-1.5 block text-sm font-semibold text-ink">Jour de la semaine (facultatif)</label><select id="day-weekday" value={weekday} onChange={e => setWeekday(e.target.value)} className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-blue-100">{weekdays.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}</select></div>
    <div><label htmlFor="day-notes" className="mb-1.5 block text-sm font-semibold text-ink">Note (facultative)</label><textarea id="day-notes" maxLength={500} rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Une précision sur cette journée…" className="w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-blue-100" /><p className="mt-1 text-right text-xs text-muted">{notes.length}/500</p></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} disabled={busy} className="min-h-11 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-50">Annuler</button><button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy ? 'Enregistrement…' : initial ? 'Enregistrer' : 'Ajouter le jour'}</button></div>
  </form>
}

function Dialog({ title, onClose, error, children }: { title: string; onClose: () => void; error?: string; children: ReactNode }) {
  const dialogRef = useRef<HTMLElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    const focusables = () => Array.from(dialog?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
    if (dialog && !dialog.contains(document.activeElement)) {
      const preferred = dialog.querySelector<HTMLElement>('[data-dialog-autofocus]')
      ;(preferred ?? focusables()[0] ?? dialog).focus()
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const items = focusables()
      if (!items.length) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (previous?.isConnected) previous.focus()
    }
  }, [])

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="program-dialog-title" tabIndex={-1} className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-xl sm:max-w-lg sm:rounded-3xl sm:p-6"><div className="mb-5 flex items-center justify-between gap-4"><h2 id="program-dialog-title" className="text-lg font-bold text-ink">{title}</h2><button type="button" onClick={onClose} aria-label="Fermer" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-surface2"><X size={20} /></button></div>{error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}{children}</section></div>
}

export function ProgramsPage() {
  const [programs, setPrograms] = useState<ProgramWithCount[]>([])
  const [days, setDays] = useState<ProgramDay[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState<'tous' | ProgramStatus>('tous')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [pageError, setPageError] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [dialog, setDialog] = useState<'new-program' | 'edit-program' | 'new-day' | 'edit-day' | 'delete-program' | 'delete-day' | 'archive-program' | null>(null)
  const [dialogError, setDialogError] = useState('')
  const [editingDay, setEditingDay] = useState<ProgramDay | undefined>()
  const [confirmText, setConfirmText] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setPageError('')
    try {
      const rows = await programService.listPrograms()
      setPrograms(rows)
      if (selected && !rows.some(program => program.id === selected)) setSelected(null)
      if (selected) setDays(await programService.listDays(selected))
    } catch (error) { setPageError(errorMessage(error)) } finally { setLoading(false) }
  }, [selected])

  useEffect(() => { void reload() }, [reload])
  const current = useMemo(() => programs.find(program => program.id === selected), [programs, selected])
  useEffect(() => {
    if (!selected) { setDays([]); return }
    let active = true
    void programService.listDays(selected).then(rows => { if (active) setDays(rows) }).catch(error => { if (active) setPageError(errorMessage(error)) })
    return () => { active = false }
  }, [selected])

  useEffect(() => { setDialogError('') }, [dialog])

  async function runAction<T>(action: () => Promise<T>, success: string): Promise<T | undefined> {
    setBusy(true); setNotice(null); setPageError(''); setDialogError('')
    try {
      const result = await action()
      setDialog(null)
      setNotice({ kind: 'success', text: success })
      await reload()
      return result
    } catch (error) {
      const message = errorMessage(error)
      if (dialog) setDialogError(message)
      else setNotice({ kind: 'error', text: message })
      return undefined
    } finally { setBusy(false) }
  }
  const closeDialog = useCallback(() => { if (!busy) setDialog(null) }, [busy])
  const visible = programs.filter(program => filter === 'tous' || program.status === filter)

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><PageTitle title={current ? current.name : 'Programmes'} subtitle={current ? current.objective || 'Organise les jours de ton programme.' : 'Construis tes programmes et organise tes jours d’entraînement.'} />{!current && <button onClick={() => setDialog('new-program')} className="gym-action inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Plus size={18} /> Nouveau programme</button>}</div>
    {notice && <div role={notice.kind === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${notice.kind === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{notice.kind === 'success' ? <Check size={18} /> : <X size={18} />}{notice.text}</div>}
    {pageError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{pageError}</p><button onClick={() => void reload()} className="mt-2 inline-flex min-h-10 items-center gap-2 font-semibold underline"><RefreshCw size={16} /> Réessayer</button></div>}
    {loading ? <Card><div className="flex items-center gap-3 py-6 text-sm text-muted" role="status"><RefreshCw className="animate-spin" size={18} /> Chargement des programmes…</div></Card> : current ? <div className="space-y-4">
      <button onClick={() => { setSelected(null); setNotice(null) }} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-muted hover:bg-surface2"><ArrowLeft size={18} /> Tous les programmes</button>
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={current.status} /><span className="text-sm text-muted">{days.length} {days.length > 1 ? 'jours' : 'jour'}</span></div><div className="flex flex-wrap gap-2">
          <button disabled={current.status === 'archive'} onClick={() => setDialog('edit-program')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-ink"><Pencil size={16} /> Modifier</button>
          {current.status !== 'archive' && <button onClick={() => void runAction(() => programService.setStatus(current.id, current.status === 'actif' ? 'pause' : 'actif'), current.status === 'actif' ? 'Programme mis en pause.' : 'Programme repris.')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-ink">{current.status === 'actif' ? <CirclePause size={16} /> : <CirclePlay size={16} />}{current.status === 'actif' ? 'Mettre en pause' : 'Reprendre'}</button>}
          {current.status === 'archive' ? <button onClick={() => void runAction(() => programService.setStatus(current.id, 'pause'), 'Programme restauré en pause.')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-ink"><RefreshCw size={16} /> Restaurer</button> : <button onClick={() => setDialog('archive-program')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-ink"><Archive size={16} /> Archiver</button>}
          <button disabled={current.status === 'archive'} onClick={() => { setConfirmText(''); setDialog('delete-program') }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-700 disabled:opacity-40"><Trash2 size={16} /> Supprimer</button>
        </div></div>
      </Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold text-ink">Jours du programme</h2><p className="text-sm text-muted">Organise l’ordre de tes journées. Les exercices seront gérés à l’étape P3-03.</p></div><button disabled={current.status === 'archive'} onClick={() => { setEditingDay(undefined); setDialog('new-day') }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Plus size={18} /> Ajouter un jour</button></div>
      {days.length === 0 ? <EmptyState icon={<CalendarDays size={26} />} title="Aucun jour pour le moment" message="Ajoute le premier jour, par exemple Pectoraux / Triceps ou Jambes." /> : <div className="space-y-3">{days.map((day, index) => <Card key={day.id} className="!p-3 sm:!p-4"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface2 text-sm font-bold text-ink">{index + 1}</div><div className="min-w-0 flex-1 pt-0.5"><h3 className="break-words font-semibold text-ink">{day.name}</h3>{day.scheduledWeekday && <p className="mt-1 text-xs text-muted">{weekdays[day.scheduledWeekday]?.label}</p>}{day.notes && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted">{day.notes}</p>}</div><div className="flex shrink-0 flex-wrap justify-end gap-1"><button disabled={index === 0 || current.status === 'archive' || busy} onClick={() => void runAction(() => programService.moveDay(day.id, -1), 'Jour déplacé vers le haut.')} aria-label={`Monter ${day.name}`} title="Monter" className="flex h-11 w-11 items-center justify-center rounded-lg border border-line text-muted disabled:opacity-30"><ArrowUp size={17} /></button><button disabled={index === days.length - 1 || current.status === 'archive' || busy} onClick={() => void runAction(() => programService.moveDay(day.id, 1), 'Jour déplacé vers le bas.')} aria-label={`Descendre ${day.name}`} title="Descendre" className="flex h-11 w-11 items-center justify-center rounded-lg border border-line text-muted disabled:opacity-30"><ArrowDown size={17} /></button><button disabled={current.status === 'archive'} onClick={() => { setEditingDay(day); setDialog('edit-day') }} aria-label={`Modifier ${day.name}`} className="flex h-11 w-11 items-center justify-center rounded-lg border border-line text-muted disabled:opacity-30"><Pencil size={16} /></button><button disabled={current.status === 'archive'} onClick={() => { setEditingDay(day); setConfirmText(''); setDialog('delete-day') }} aria-label={`Supprimer ${day.name}`} className="flex h-11 w-11 items-center justify-center rounded-lg border border-red-200 text-red-700 disabled:opacity-30"><Trash2 size={16} /></button></div></div></Card>)}</div>}
    </div> : <div className="space-y-4">
      <div className="flex flex-wrap gap-2 pb-1" role="group" aria-label="Filtrer les programmes">{([{value:'tous',label:'Tous'},{value:'actif',label:'Actifs'},{value:'pause',label:'En pause'},{value:'archive',label:'Archivés'}] as const).map(item => <button key={item.value} onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={`min-h-11 rounded-xl border px-3.5 text-sm font-semibold ${filter === item.value ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-line bg-surface text-muted'}`}>{item.label}</button>)}</div>
      {visible.length === 0 ? <div><EmptyState icon={<CalendarDays size={28} />} title={programs.length === 0 ? 'Aucun programme pour le moment' : 'Aucun programme dans cette catégorie'} message={programs.length === 0 ? 'Crée ton premier programme puis ajoute les jours qui composent ta semaine.' : 'Essaie une autre catégorie ou affiche tous tes programmes.'} action={undefined} />{programs.length > 0 && filter !== 'tous' && <button onClick={() => setFilter('tous')} className="mx-auto flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-accent hover:bg-blue-50">Afficher tous les programmes</button>}</div> : <div className="grid gap-3 md:grid-cols-2">{visible.map(program => <Card key={program.id} className="flex min-w-0 flex-col gap-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-base font-bold text-ink">{program.name}</h2>{program.objective && <p className="mt-1 break-words text-sm leading-5 text-muted">{program.objective}</p>}</div><StatusBadge status={program.status} /></div><div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3"><span className="text-sm text-muted">{program.daysCount} {program.daysCount > 1 ? 'jours' : 'jour'}</span><button onClick={() => setSelected(program.id)} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-accent hover:bg-blue-50">Ouvrir <ChevronRight size={17} /></button></div></Card>)}</div>}
    </div>}
    {dialog && <Dialog title={dialog === 'new-program' ? 'Nouveau programme' : dialog === 'edit-program' ? 'Modifier le programme' : dialog === 'new-day' ? 'Ajouter un jour' : dialog === 'edit-day' ? 'Modifier le jour' : dialog === 'delete-program' ? 'Supprimer le programme ?' : dialog === 'delete-day' ? 'Supprimer le jour ?' : 'Archiver le programme ?'} onClose={closeDialog} error={dialogError}>
      {dialog === 'new-program' || dialog === 'edit-program' ? <ProgramForm initial={dialog === 'edit-program' ? current : undefined} busy={busy} onCancel={closeDialog} onSave={async input => {
        if (dialog === 'edit-program' && current) {
          await runAction(() => programService.updateProgram(current.id, input), 'Modifications enregistrées.')
        } else {
          const created = await runAction(() => programService.createProgram(input), 'Programme créé.')
          if (created) setSelected(created.id)
        }
      }} /> : null}
      {dialog === 'new-day' || dialog === 'edit-day' ? <DayForm initial={dialog === 'edit-day' ? editingDay : undefined} busy={busy} onCancel={closeDialog} onSave={async input => {
        await runAction(() => dialog === 'edit-day' && editingDay ? programService.updateDay(editingDay.id, input) : programService.createDay(current!.id, input), dialog === 'edit-day' ? 'Jour modifié.' : 'Jour ajouté.')
      }} /> : null}
      {dialog === 'archive-program' && <div className="space-y-4"><p className="text-sm leading-6 text-muted">Le programme restera consultable, avec ses jours et sa configuration. Il ne sera plus proposé comme programme actif. Tu pourras le restaurer en pause plus tard.</p><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={closeDialog} className="min-h-11 rounded-xl border border-line px-4 text-sm font-semibold text-ink">Annuler</button><button onClick={() => void runAction(() => programService.setStatus(current!.id, 'archive'), 'Programme archivé.')} disabled={busy} className="min-h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Archivage…' : 'Archiver le programme'}</button></div></div>}
    {(dialog === 'delete-program' || dialog === 'delete-day') && <div className="space-y-4"><p className="text-sm leading-6 text-muted">{dialog === 'delete-program' ? `Le programme « ${current?.name} » et ses jours seront supprimés si aucune séance enregistrée ne les référence. L’historique sera conservé ; si le programme est lié à une séance, la suppression sera refusée et tu pourras l’archiver.` : `Le jour « ${editingDay?.name} » et sa configuration planifiée seront supprimés si aucune séance enregistrée ne le référence. L’historique ne sera jamais supprimé.`}</p>{dialog === 'delete-program' && <label className="flex items-start gap-3 rounded-xl border border-line p-3 text-sm text-ink"><input type="checkbox" checked={confirmText === 'confirm'} onChange={e => setConfirmText(e.target.checked ? 'confirm' : '')} className="mt-0.5 h-4 w-4 accent-blue-600" />Je comprends que la définition du programme sera supprimée.</label>}<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={closeDialog} disabled={busy} className="min-h-11 rounded-xl border border-line px-4 text-sm font-semibold text-ink">Annuler</button><button disabled={busy || (dialog === 'delete-program' && confirmText !== 'confirm')} onClick={() => void runAction(() => dialog === 'delete-program' ? programService.deleteProgram(current!.id).then(() => { setSelected(null) }) : programService.deleteDay(editingDay!.id), dialog === 'delete-program' ? 'Programme supprimé.' : 'Jour supprimé.')} className="min-h-11 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{busy ? 'Suppression…' : 'Confirmer la suppression'}</button></div></div>}
    </Dialog>}
  </div>
}
