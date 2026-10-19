import { useEffect, useRef, useState } from 'react'
import { Check, RefreshCw, X } from 'lucide-react'
import { registerSW } from 'virtual:pwa-register'

let registrationStarted = false

export default function PWAStatus() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const [error, setError] = useState('')
  const update = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    if (registrationStarted || !('serviceWorker' in navigator)) return
    registrationStarted = true
    update.current = registerSW({
      immediate: true,
      onNeedRefresh() { setUpdateAvailable(true) },
      onOfflineReady() { setOfflineReady(true) },
      onRegisterError(cause) { setError(cause instanceof Error ? cause.message : 'La mise à jour hors-ligne est indisponible.') },
    })
  }, [])

  if (!updateAvailable && !offlineReady && !error) return null
  return <aside aria-label="État de l’application hors ligne" className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-40 mx-auto max-w-lg rounded-2xl border border-line bg-surface p-4 shadow-xl sm:bottom-5">
    {updateAvailable ? <><p className="font-bold text-ink">Mise à jour disponible</p><p className="mt-1 text-sm text-muted">GYM OS peut être actualisée. Enregistre ou mets ta séance en pause avant de recharger.</p><div className="mt-3 flex gap-2"><button onClick={() => void update.current?.(true)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-3 text-sm font-bold text-white"><RefreshCw size={16} /> Actualiser l’application</button><button onClick={() => setUpdateAvailable(false)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-line" aria-label="Plus tard"><X size={17} /></button></div></> : offlineReady ? <div className="flex items-start gap-3"><Check size={18} className="mt-0.5 text-emerald-700" /><div className="min-w-0 flex-1"><p className="font-semibold text-ink">Application prête hors ligne</p><p className="mt-1 text-sm text-muted">La structure de GYM OS est disponible hors ligne. Tes données d’entraînement restent enregistrées localement sur cet appareil.</p></div><button onClick={() => setOfflineReady(false)} aria-label="Fermer" className="flex h-10 w-10 items-center justify-center rounded-lg"><X size={17} /></button></div> : <p role="status" className="text-sm text-red-700">{error}</p>}
  </aside>
}
