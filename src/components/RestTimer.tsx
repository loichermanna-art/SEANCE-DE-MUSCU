import { useEffect, useRef, useState, type JSX } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlarmClock, Pause, Play, Trash2 } from 'lucide-react'
import { db } from '../services/db'
import { adjustRestTimer, stopRestTimer } from '../services/workoutService'
import { restRemainingSeconds } from '../domain/session'

/** Bip de fin (WebAudio — aucun asset, fonctionne hors-ligne). */
function beep(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
    setTimeout(() => void ctx.close().catch(() => {}), 800)
  } catch {
    /* audio indisponible : le visuel suffit */
  }
}

function notify(title: string, body: string): void {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    new Notification(title, { body })
  } else if (Notification.permission === 'default') {
    void Notification.requestPermission().catch(() => {})
  }
}

/**
 * Minuteur de repos global (§7.4) — ROBUSTE EN ARRIÈRE-PLAN :
 *  • la fin est un horodatage ABSOLU persisté dans IndexedDB,
 *    le décompte est recalculé à chaque tick : la suspension
 *    d'onglet (throttling setInterval) ne peut pas le faire dériver ;
 *  • il survit au rechargement de page ;
 *  • alerte sonore + vibration + notification au terme.
 */
export default function RestTimer(): JSX.Element | null {
  const timer = useLiveQuery(() => db.restTimers.get('active'), [])
  const [now, setNow] = useState(() => Date.now())
  const [dismissed, setDismissed] = useState(false)
  const expiredAtRef = useRef<string | null>(null)
  const originalTitle = useRef(document.title)

  // Tick — le calcul reste exact même si les ticks sont retardés
  useEffect(() => {
    if (!timer) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [timer?.id, timer?.endsAt])

  const remaining = timer ? restRemainingSeconds(timer.endsAt, now) : 0
  const expired = Boolean(timer) && remaining <= 0

  // Alerte de fin : un seul déclenchement par minuteur
  useEffect(() => {
    if (!timer || !expired) return
    if (expiredAtRef.current === timer.createdAt) return
    expiredAtRef.current = timer.createdAt
    setDismissed(false)
    beep()
    notify('Repos terminé — GYM OS', timer.label ? `${timer.label} : la série suivante t'attend` : 'La série suivante t’attend')
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200])
  }, [expired, timer])

  // Titre de l'onglet = décompte visible depuis un autre onglet (§7.4)
  useEffect(() => {
    if (timer && !expired) {
      const mins = Math.floor(remaining / 60)
      const secs = remaining % 60
      document.title = `⏱ ${mins}:${String(secs).padStart(2, '0')} — GYM OS`
      return () => { document.title = originalTitle.current }
    }
    if (expired) {
      document.title = '✅ Repos terminé — GYM OS'
      return () => { document.title = originalTitle.current }
    }
    document.title = originalTitle.current
  }, [timer, expired, remaining])

  if (!timer || dismissed) return null

  const total = Math.max(1, timer.durationSeconds)
  const progress = expired ? 0 : Math.min(100, Math.round((remaining / total) * 100))
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 flex justify-center px-4 sm:bottom-6" role="timer" aria-live="polite">
      <div className={`w-full max-w-md rounded-2xl border bg-surface/95 p-4 shadow-2xl backdrop-blur ${expired ? 'border-success/60' : 'border-accent/50'}`}>
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${expired ? 'bg-success/15 text-success' : 'bg-accent/15 text-accent'}`}>
            <AlarmClock size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {expired ? 'Repos terminé — à toi' : `Repos${timer.label ? ` · ${timer.label}` : ''}`}
            </p>
            <p className={`numeric text-3xl font-extrabold ${expired ? 'text-success' : ''}`}>
              {expired ? '0:00' : `${mins}:${String(secs).padStart(2, '0')}`}
            </p>
          </div>
          {!expired ? (
            <div className="flex items-center gap-1">
              <button onClick={() => void adjustRestTimer(15)} className="rounded-lg bg-surface2 px-2.5 py-2 text-xs font-bold transition hover:bg-line" title="+15 s">+15</button>
              <button onClick={() => void adjustRestTimer(-15)} className="rounded-lg bg-surface2 px-2.5 py-2 text-xs font-bold transition hover:bg-line" title="−15 s">−15</button>
              <button onClick={() => void stopRestTimer()} className="rounded-lg bg-surface2 p-2 text-muted transition hover:text-danger" title="Arrêter le minuteur" aria-label="Arrêter le minuteur">
                <Trash2 size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => setDismissed(true)} className="rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink transition hover:brightness-110">
              C'est parti
            </button>
          )}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface2">
          <div className={`h-full rounded-full transition-[width] duration-300 ${expired ? 'bg-success' : 'bg-accent'}`} style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted">
          {expired ? <Play size={11} /> : <Pause size={11} />}
          {expired
            ? 'Le minuteur a continué de tourner en arrière-plan — reprends où tu en étais.'
            : 'Persisté localement : il survit aux changements d’onglet et au rechargement.'}
        </p>
      </div>
    </div>
  )
}
