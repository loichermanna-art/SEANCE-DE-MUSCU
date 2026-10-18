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
    <header className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
      {subtitle ? <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted">{subtitle}</p> : null}
    </header>
  )
}

/** État vide explicite : jamais de données inventées. */
export function EmptyState({ icon, title, message, action }: {
  icon: ReactNode
  title: string
  message: string
  action?: { label: string; to: string }
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface2 text-muted">{icon}</div>
      <h2 className="font-semibold text-ink">{title}</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted">{message}</p>
      {action ? (
        <Link to={action.to} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition-colors hover:bg-blue-700 focus-visible:outline-offset-2">
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="numeric mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-5 text-muted">{hint}</p> : null}
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
