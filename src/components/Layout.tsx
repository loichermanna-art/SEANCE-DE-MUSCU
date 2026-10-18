import { NavLink, Outlet } from 'react-router-dom'
import { Home, CalendarDays, Dumbbell, TrendingUp, User, HeartPulse, Library, Wifi, WifiOff, Cloud } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { isSupabaseConfigured } from '../lib/supabase'

const NAV = [
  { to: '/', label: 'Accueil', icon: Home, end: true },
  { to: '/programme', label: 'Programme', icon: CalendarDays },
  { to: '/seance', label: 'Séance', icon: Dumbbell, primary: true },
  { to: '/progression', label: 'Progression', icon: TrendingUp },
  { to: '/profil', label: 'Profil', icon: User },
]

const SECONDARY = [
  { to: '/exercices', label: 'Exercices', icon: Library },
  { to: '/recuperation', label: 'Récupération', icon: HeartPulse },
]

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

/** Indicateur honnête de l'état des données (§15.3) : local / supabase / hors-ligne */
function DataStatus() {
  const online = useOnline()
  if (!online) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-warning">
        <WifiOff size={14} /> Hors ligne — données conservées sur l’appareil
      </span>
    )
  }
  return isSupabaseConfigured ? (
    <span className="inline-flex items-center gap-1.5 text-xs text-success">
      <Cloud size={14} /> Supabase configuré · en ligne
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <Wifi size={14} /> Mode local (Supabase non configuré)
    </span>
  )
}

function NavItem({ to, label, icon: Icon, end, primary }: {
  to: string; label: string; icon: typeof Home; end?: boolean; primary?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        primary
          ? `gym-nav-item gym-nav-primary gym-action flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-bold sm:flex-row sm:gap-3 sm:px-4 sm:py-3 sm:text-sm ${
              isActive ? 'bg-accent text-accent-ink' : 'bg-accent text-accent-ink hover:bg-blue-700'
            }`
          : `gym-nav-item gym-action flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium sm:flex-row sm:gap-3 sm:px-4 sm:py-3 sm:text-sm ${
              isActive ? 'bg-blue-50 text-accent' : 'text-muted hover:bg-surface2 hover:text-ink'
            }`
      }
    >
      <Icon size={20} strokeWidth={primary ? 2.4 : 2} />
      {label}
    </NavLink>
  )
}

export default function Layout(): ReactNode {
  return (
    <div className="min-h-dvh bg-base text-ink">
      {/* Barre latérale — ordinateur (§14.3) */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line bg-surface px-4 py-6 sm:flex">
        <div className="mb-1 flex items-center gap-2.5 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-ink">
            <Dumbbell size={20} strokeWidth={2.5} />
          </span>
          <span className="text-lg font-extrabold tracking-tight">GYM OS</span>
        </div>
        <p className="mb-6 px-2 text-xs text-muted">Ton système de progression</p>
        <nav className="flex flex-col gap-1" aria-label="Navigation principale">
          {NAV.map((item) => <NavItem key={item.to} {...item} />)}
          <p className="mt-5 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted">Bibliothèque & santé</p>
          {SECONDARY.map((item) => <NavItem key={item.to} {...item} />)}
        </nav>
        <div className="mt-auto px-2"><DataStatus /></div>
      </aside>

      {/* En-tête — mobile */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface px-4 py-3 sm:hidden">
        <span className="flex items-center gap-2 font-extrabold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-ink">
            <Dumbbell size={17} strokeWidth={2.5} />
          </span>
          GYM OS
        </span>
        <DataStatus />
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:pb-10 sm:pl-72 sm:pr-8 sm:pt-8">
        <Outlet />
      </main>

      {/* Navigation inférieure — mobile, accessible au pouce (§14.3) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-end justify-around border-t border-line bg-surface px-2 pb-[env(safe-area-inset-bottom)] pt-2 sm:hidden" aria-label="Navigation principale">
        {NAV.map((item) => <NavItem key={item.to} {...item} />)}
      </nav>
    </div>
  )
}
