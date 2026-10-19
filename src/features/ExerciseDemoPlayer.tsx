import { useEffect, useMemo, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import type { ExerciseDemonstration } from '../domain/types'
import { ANIMATION_KEYS } from '../domain/exerciseDemonstrations'

type Stage = 0 | 1 | 2
const STAGES = ['Départ', 'Mouvement', 'Retour'] as const
const EQUIPMENT: Record<string, string> = {
  'bench-press': 'bar', 'incline-dumbbell-press': 'dumbbells', 'pull-up': 'bar',
  'barbell-row': 'bar', 'lat-pulldown': 'cable', 'overhead-press': 'bar',
  'lateral-raise': 'dumbbells', 'barbell-curl': 'bar', 'barbell-squat': 'bar',
  'leg-press': 'machine', 'romanian-deadlift': 'bar', 'hip-thrust': 'bar',
  crunch: 'mat', plank: 'mat',
}
const PHASE_TEXT: Record<string, string[]> = {
  'bench-press': ['Barre au-dessus de la poitrine, pieds au sol.', 'Descendre la barre avec contrôle.', 'Pousser sans rebondir.'],
  'incline-dumbbell-press': ['Haltères au-dessus du haut de la poitrine.', 'Descendre les haltères de chaque côté.', 'Pousser sans claquer les haltères.'],
  'pull-up': ['Bras tendus, corps stable.', 'Tirer le corps vers la barre.', 'Redescendre sans balancer.'],
  'barbell-row': ['Buste incliné, dos plat.', 'Tirer la barre vers le ventre.', 'Tendre les bras en contrôlant.'],
  'lat-pulldown': ['Bras élevés, buste stable.', 'Tirer la barre vers la poitrine.', 'Remonter la barre avec contrôle.'],
  'overhead-press': ['Barre à hauteur des épaules.', 'Pousser la barre au-dessus de la tête.', 'Redescendre sans cambrer.'],
  'lateral-raise': ['Haltères près des cuisses.', 'Lever jusqu’à hauteur des épaules.', 'Redescendre lentement.'],
  'barbell-curl': ['Bras allongés, coudes près du corps.', 'Fléchir les coudes sans balancer.', 'Étendre les bras lentement.'],
  'barbell-squat': ['Pieds stables, barre sur le haut du dos.', 'Descendre en gardant les genoux dans l’axe.', 'Pousser le sol pour remonter.'],
  'leg-press': ['Genoux légèrement fléchis.', 'Descendre sans décoller le bassin.', 'Repousser sans verrouiller brutalement.'],
  'romanian-deadlift': ['Barre proche des cuisses.', 'Pousser les hanches vers l’arrière.', 'Se redresser en contractant les fessiers.'],
  'hip-thrust': ['Bassin bas, haut du dos sur le banc.', 'Monter le bassin en contrôlant.', 'S’arrêter à l’alignement sans cambrer.'],
  crunch: ['Dos au sol, nuque neutre.', 'Enrouler le haut du tronc.', 'Redescendre lentement.'],
  plank: ['Coudes sous les épaules.', 'Garder le corps aligné.', 'Maintenir la position et respirer.'],
}

function Figure({ animationKey, stage, motionEnabled }: { animationKey: string; stage: Stage; motionEnabled: boolean }) {
  const isPlank = animationKey === 'plank'
  const isCrunch = animationKey === 'crunch'
  const isPull = animationKey === 'pull-up'
  const isSquat = animationKey === 'barbell-squat' || animationKey === 'leg-press'
  const isPress = ['bench-press', 'incline-dumbbell-press', 'overhead-press'].includes(animationKey)
  const isRaise = animationKey === 'lateral-raise'
  const isCurl = animationKey === 'barbell-curl'
  const isRow = ['barbell-row', 'romanian-deadlift', 'hip-thrust'].includes(animationKey)
  const isBench = ['bench-press', 'incline-dumbbell-press'].includes(animationKey)
  const isHipThrust = animationKey === 'hip-thrust'
  const isLegPress = animationKey === 'leg-press'
  const pose = isPlank ? 'translate(0 0)' : isCrunch ? (stage === 1 ? 'rotate(-22 126 103)' : 'rotate(0 126 103)') : isPull ? (stage === 1 ? 'translate(0 -15)' : 'translate(0 0)') : isSquat ? (stage === 1 ? 'translate(0 16) rotate(8 120 110)' : 'translate(0 0)') : isPress ? (stage === 1 ? 'translate(0 -13)' : 'translate(0 0)') : isRaise ? (stage === 1 ? 'rotate(-24 123 92)' : 'rotate(0 123 92)') : isCurl ? (stage === 1 ? 'rotate(-28 130 106)' : 'rotate(0 130 106)') : isRow ? (stage === 1 ? 'rotate(-12 126 112)' : 'rotate(0 126 112)') : 'translate(0 0)'
  const body = isPlank || isCrunch
  return (
    <svg viewBox="0 0 260 190" aria-hidden="true" focusable="false" className="h-auto w-full max-w-md" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="244" height="174" rx="18" fill="#f4f7fb" />
      <path d="M20 156 H240" stroke="#d1dbe8" strokeWidth="2" />
      {(EQUIPMENT[animationKey] === 'bar' || EQUIPMENT[animationKey] === 'dumbbells') && !body ? <g stroke="#52647c" strokeWidth="4" strokeLinecap="round"><path d={isPress ? 'M72 48 H190' : isPull ? 'M68 38 H192' : 'M67 63 H193'} /><path d={isPress ? 'M80 40 V56 M182 40 V56' : isPull ? 'M78 30 V46 M182 30 V46' : 'M78 55 V71 M182 55 V71'} /></g> : null}
      {EQUIPMENT[animationKey] === 'mat' ? <path d="M25 158 H235" stroke="#91a7c4" strokeWidth="6" strokeLinecap="round" /> : null}
      {EQUIPMENT[animationKey] === 'machine' ? <g stroke="#8b9bb0" strokeWidth="6" strokeLinecap="round"><path d="M178 70 L218 153 H182" fill="none" /><path d="M185 83 L226 83" /></g> : null}
      {isBench ? <g transform={pose} style={{ transition: motionEnabled ? "transform 500ms ease-in-out" : "none" }} stroke="#245fe5" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M48 126 H190" stroke="#8b9bb0" strokeWidth="5" /><path d="M68 126 V148 M175 126 V148" stroke="#8b9bb0" strokeWidth="4" />
        <circle cx="57" cy="105" r="10" fill="#e8b28a" stroke="none" /><path d="M68 110 L133 113 L161 139" /><path d={stage === 1 ? "M91 111 L99 79 L111 65" : "M91 111 L101 88 L111 65"} /><path d={stage === 1 ? "M107 112 L119 79 L132 65" : "M107 112 L119 88 L132 65"} />
      </g> : null}
      {isHipThrust ? <g style={{ transition: motionEnabled ? "transform 500ms ease-in-out" : "none" }} stroke="#245fe5" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M86 130 H128 V151" stroke="#8b9bb0" strokeWidth="6" /><circle cx="62" cy={stage === 1 ? 98 : 116} r="10" fill="#e8b28a" stroke="none" />
        <path d={stage === 1 ? "M72 101 L111 83 L148 101 L184 137" : "M72 119 L111 119 L148 128 L184 137"} /><path d="M111 119 L99 145" /><path d="M148 128 L155 149" />
        <path d={stage === 1 ? "M91 86 H161" : "M91 122 H161"} stroke="#52647c" strokeWidth="3" />
      </g> : null}
      {isLegPress ? <g style={{ transition: motionEnabled ? "transform 500ms ease-in-out" : "none" }} stroke="#245fe5" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M188 63 L221 145 H190" stroke="#8b9bb0" strokeWidth="6" /><path d="M96 92 L120 117 L132 140" /><circle cx="84" cy="82" r="10" fill="#e8b28a" stroke="none" />
        <path d="M92 91 L119 112" /><path d={stage === 1 ? "M119 112 L155 119 L184 119" : "M119 112 L146 98 L178 91"} />
      </g> : null}
      {!isBench && !isHipThrust && !isLegPress ? <g transform={pose} style={{ transition: motionEnabled ? "transform 500ms ease-in-out" : "none" }} stroke="#245fe5" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {body ? <><path d="M74 139 L128 126 L173 146" /><path d="M128 126 L117 147" /><path d="M128 126 L143 147" /><circle cx="61" cy="139" r="10" fill="#e8b28a" stroke="none" /></> :
          <><circle cx="126" cy="57" r="11" fill="#e8b28a" stroke="none" /><path d="M126 70 L126 108" /><path d="M126 80 L97 96 L83 76" /><path d={isRaise && stage === 1 ? 'M126 80 L95 56 L84 42' : isPress && stage === 1 ? 'M126 80 L103 52 L101 28' : isPull && stage === 1 ? 'M126 80 L107 54 L107 38' : 'M126 80 L104 91 L92 102'} /><path d={isSquat && stage === 1 ? 'M126 108 L104 126 L89 151' : 'M126 108 L115 135 L111 153'} /><path d={isSquat && stage === 1 ? 'M126 108 L148 123 L162 149' : 'M126 108 L143 135 L151 153'} /><path d={isPress && stage === 1 ? 'M126 80 L145 51 L145 26' : isPull && stage === 1 ? 'M126 80 L148 54 L148 38' : isRaise && stage === 1 ? 'M126 80 L157 56 L169 42' : isCurl && stage === 1 ? 'M126 80 L148 91 L151 71' : 'M126 80 L147 91 L159 102'} /></>}
      </g> : null}
      {EQUIPMENT[animationKey] === 'dumbbells' ? <g fill="#52647c"><rect x={isRaise && stage === 1 ? 77 : 85} y={isRaise && stage === 1 ? 36 : 97} width="14" height="7" rx="2"/><rect x={isRaise && stage === 1 ? 165 : 152} y={isRaise && stage === 1 ? 36 : 97} width="14" height="7" rx="2"/></g> : null}
      {EQUIPMENT[animationKey] === 'bar' ? <path d="M78 66 H178" stroke="#245fe5" strokeWidth="3" strokeLinecap="round" opacity=".75" /> : null}
      <text x="20" y="28" fill="#647084" fontSize="9" fontWeight="600">{STAGES[stage].toUpperCase()}</text>
    </svg>
  )
}

export default function ExerciseDemoPlayer({ demonstration }: { demonstration: ExerciseDemonstration }) {
  const reducedMotion = useReducedMotion()
  const [playing, setPlaying] = useState(false)
  const [stage, setStage] = useState<Stage>(0)
  const [speed, setSpeed] = useState(1)
  const allowed = ANIMATION_KEYS.has(demonstration.animationKey)
  const label = useMemo(() => demonstration.accessibilityLabel, [demonstration.accessibilityLabel])

  useEffect(() => {
    if (!playing || reducedMotion || !allowed || demonstration.animationKey === 'plank') return
    const interval = window.setInterval(() => {
      if (stage >= 2) {
        setPlaying(false)
        return
      }
      setStage((stage + 1) as Stage)
    }, 1050 / speed)
    return () => window.clearInterval(interval)
  }, [playing, reducedMotion, allowed, speed, stage, demonstration.animationKey])

  useEffect(() => {
    if (reducedMotion) setPlaying(false)
  }, [reducedMotion])

  useEffect(() => {
    const stop = () => setPlaying(false)
    document.addEventListener('visibilitychange', stop)
    return () => document.removeEventListener('visibilitychange', stop)
  }, [])

  useEffect(() => {
    setPlaying(false)
    setStage(0)
  }, [demonstration.id])

  const phases = PHASE_TEXT[demonstration.animationKey] ?? [label, label, label]
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5" aria-label={`Démonstration : ${label}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-accent">Démonstration guidée</p><h3 className="mt-1 font-semibold">Mouvement en 3 étapes</h3></div>
        <span className="rounded-full bg-surface2 px-2.5 py-1 text-xs text-muted">{reducedMotion ? 'Mode statique' : 'Animation vectorielle'}</span>
      </div>
      <div className="mt-3 flex justify-center"><Figure animationKey={allowed ? demonstration.animationKey : 'plank'} stage={stage} motionEnabled={!reducedMotion} /></div>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted" aria-live="polite">{phases[stage]}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={reducedMotion || !allowed || demonstration.animationKey === 'plank'} onClick={() => setPlaying((v) => !v)} className="gym-action inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:cursor-not-allowed disabled:opacity-50" aria-pressed={playing}>
          {playing ? <Pause size={16} /> : <Play size={16} />}{playing ? 'Pause' : 'Lire'}
        </button>
        <button type="button" onClick={() => { setPlaying(false); setStage(0) }} className="gym-action inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold"><RotateCcw size={16} />Rejouer</button>
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm"><span>Vitesse</span><select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="bg-transparent py-2" aria-label="Vitesse de l’animation"><option value={0.5}>0,5×</option><option value={1}>1×</option><option value={1.5}>1,5×</option></select></label>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {STAGES.map((name, index) => <button key={name} type="button" onClick={() => { setPlaying(false); setStage(index as Stage) }} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-medium ${stage === index ? 'border-accent bg-surface2 text-accent' : 'border-line text-muted'}`} aria-pressed={stage === index}>{name}</button>)}
      </div>
      {reducedMotion ? <p className="mt-3 text-xs leading-5 text-muted">La préférence système de mouvement réduit est active : la lecture animée est désactivée. Tu peux consulter chaque étape manuellement.</p> : null}
    </section>
  )
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])
  return reduced
}
