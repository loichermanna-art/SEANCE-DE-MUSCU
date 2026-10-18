import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, Dumbbell, Flame, HeartPulse, Play, RotateCcw } from 'lucide-react'
import { db } from '../services/db'
import { Card, EmptyState, PageTitle, Stat } from '../components/ui'

function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = (date.getDay() + 6) % 7 // lundi = 0
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - day)
  return date
}

export default function DashboardPage() {
  const data = useLiveQuery(async () => {
    const [profile, sessions, programs, lastCheckin] = await Promise.all([
      db.profiles.orderBy('updatedAt').last(),
      db.workoutSessions.toArray(),
      db.programs.where('status').equals('actif').toArray(),
      db.recoveryCheckins.orderBy('recordedAt').last(),
    ])
    const weekStart = startOfWeek(new Date()).getTime()
    const doneThisWeek = sessions.filter(
      (s) => s.status === 'terminee' && s.endedAt && new Date(s.endedAt).getTime() >= weekStart,
    ).length
    const inProgress = sessions.find((s) => s.status === 'en_cours')
    const recent = sessions
      .filter((s) => s.status === 'terminee')
      .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))
      .slice(0, 3)
    return { profile, doneThisWeek, totalDone: sessions.filter((s) => s.status === 'terminee').length, inProgress, activeProgram: programs[0], recent, lastCheckin }
  }, [])

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div>
      <PageTitle
        title={data?.profile ? `Salut ${data.profile.displayName} 💪` : 'Bienvenue sur GYM OS'}
        subtitle={`Nous sommes le ${today}.`}
      />

      {/* Reprise d'une séance interrompue (§4.1, §7.5) */}
      {data?.inProgress ? (
        <Card className="mb-5 border-accent/50 bg-accent/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-bold"><RotateCcw size={18} /> Séance en cours : {data.inProgress.name}</h2>
              <p className="mt-0.5 text-sm text-muted">Commencée le {data.inProgress.startedAt ? new Date(data.inProgress.startedAt).toLocaleString('fr-FR') : '—'} — aucune donnée n’est perdue.</p>
            </div>
            <Link to="/seance" className="gym-action rounded-xl bg-accent px-5 py-3 font-bold text-accent-ink hover:brightness-110">Reprendre ma séance</Link>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Stat label="Séances cette semaine" value={String(data?.doneThisWeek ?? 0)} hint={data?.activeProgram ? `Programme : ${data.activeProgram.name}` : 'Aucun programme actif'} />
        <Stat label="Séances terminées" value={String(data?.totalDone ?? 0)} hint="Depuis tes débuts sur l’app" />
        <Stat label="Récupération" value={data?.lastCheckin ? `Énergie ${data.lastCheckin.energyLevel ?? '—'}/5` : '—'} hint={data?.lastCheckin ? `Dernier bilan : ${new Date(data.lastCheckin.recordedAt).toLocaleDateString('fr-FR')}` : 'Aucun bilan enregistré'} />
        <Stat label="Prochaine séance" value={data?.activeProgram ? 'À planifier' : '—'} hint={data?.activeProgram ? 'Voir le programme' : 'Crée ton programme pour commencer'} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 flex items-center gap-2 font-bold"><CalendarDays size={18} /> Ta prochaine séance</h2>
          {data?.activeProgram ? (
            <>
              <p className="text-sm text-muted">Programme actif : <strong className="text-ink">{data.activeProgram.name}</strong>. Les séances planifiées apparaîtront ici dès la gestion des programmes (Phase 3).</p>
              <Link to="/programme" className="gym-action mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-bold text-accent-ink hover:brightness-110"><Play size={17} /> Voir mon programme</Link>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">Aucun programme pour le moment. Crée ton premier programme pour savoir exactement quoi entraîner, quand et dans quel ordre.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/programme" className="gym-action inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-bold text-accent-ink hover:brightness-110"><Play size={17} /> Créer mon programme</Link>
                <Link to="/seance" className="gym-action inline-flex items-center gap-2 rounded-xl border border-line bg-surface2 px-5 py-3 font-semibold hover:border-accent/50"><Dumbbell size={17} /> Séance libre</Link>
              </div>
            </>
          )}
          {!data?.profile ? (
            <p className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-warning">
              Commence par créer ton profil sportif dans l’onglet Profil : il servira à personnaliser tes programmes et tes recommandations.
            </p>
          ) : null}
        </Card>

        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-bold"><Flame size={18} /> Dernières séances</h2>
          {data?.recent && data.recent.length > 0 ? (
            <ul className="divide-y divide-line">
              {data.recent.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted">{s.endedAt ? new Date(s.endedAt).toLocaleDateString('fr-FR') : ''}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<Dumbbell size={28} />}
              title="Aucune séance terminée pour l’instant"
              message="Dès que tu auras terminé ta première séance, elle apparaîtra ici — sans aucune donnée inventée."
            />
          )}
          <Link to="/recuperation" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
            <HeartPulse size={16} /> Faire mon bilan de récupération
          </Link>
        </Card>
      </div>
    </div>
  )
}
