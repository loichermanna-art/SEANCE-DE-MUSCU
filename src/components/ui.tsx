import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      {children}
    </section>
  )
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-5">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
    </header>
  )
}

/** État vide explicite (§8.3, §14.5) : jamais de données inventées. */
export function EmptyState({ icon, title, message, action }: {
  icon: ReactNode
  title: string
  message: string
  action?: { label: string; to: string }
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center">
      <div className="mb-3 text-muted">{icon}</div>
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted">{message}</p>
      {action ? (
        <Link to={action.to} className="mt-4 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:brightness-110">
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="numeric mt-1 text-2xl font-bold">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  )
}

export function PhaseBadge({ phase }: { phase: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line bg-surface2 px-2.5 py-1 text-xs font-medium text-muted">
      {phase}
    </span>
  )
}
