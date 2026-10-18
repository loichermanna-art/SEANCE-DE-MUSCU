import { CalendarDays, Dumbbell, HeartPulse, TrendingUp } from 'lucide-react'
import { ProgramsPage as ProgramsManagementPage } from './ProgramsPage'
import { EmptyState, PageTitle, PhaseBadge } from '../components/ui'

export function ProgramsPage() { return <ProgramsManagementPage /> }

export function WorkoutPage() {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3"><PageTitle title="Séance en direct" subtitle="Le cœur de GYM OS : saisie rapide des séries, minuteur de repos, sauvegarde progressive." /><span className="mb-5 ml-auto"><PhaseBadge phase="Phase 4 — cœur du produit" /></span></div>
      <EmptyState icon={<Dumbbell size={28} />} title="Le mode séance arrive en Phase 4" message="Après les programmes (Phase 3), tu pourras démarrer une séance, valider chaque série en un geste, lancer le minuteur de repos et reprendre une séance interrompue sans perdre tes données." action={{ label: 'Voir les exercices disponibles', to: '/exercices' }} />
    </div>
  )
}

export function ProgressPage() {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3"><PageTitle title="Progression" subtitle="Graphiques, records et historiques — alimentés uniquement par tes vraies séances." /><span className="mb-5 ml-auto"><PhaseBadge phase="Phase 5" /></span></div>
      <EmptyState icon={<TrendingUp size={28} />} title="Aucune donnée de progression pour l’instant" message="C’est normal : GYM OS n’affiche jamais de graphiques inventés. Dès tes premières séances terminées, tu verras ici l’évolution de tes charges, ton volume et ta régularité." />
    </div>
  )
}

export function RecoveryPage() {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3"><PageTitle title="Récupération" subtitle="Courbatures (échelle 0–4), fatigue, sommeil et adaptations transparentes de ta séance." /><span className="mb-5 ml-auto"><PhaseBadge phase="Phase 6" /></span></div>
      <EmptyState icon={<HeartPulse size={28} />} title="Le suivi de récupération arrive en Phase 6" message="Tu pourras déclarer tes courbatures par groupe musculaire, ton énergie et ton sommeil. L’application proposera alors des adaptations expliquées — sans jamais forcer une séance ni présenter une sensation comme un diagnostic." />
    </div>
  )
}
