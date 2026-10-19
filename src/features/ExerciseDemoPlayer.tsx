import { useEffect, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import type { ExerciseDemonstration } from '../domain/types'
import { ANIMATION_KEYS } from '../domain/exerciseDemonstrations'

type Stage = 0 | 1 | 2
type Point = { x: number; y: number }
type Pair = [Point, Point]
type Pose = {
  head: Point
  shoulders: Pair
  hips: Pair
  elbows: Pair
  wrists: Pair
  knees: Pair
  ankles: Pair
}

const STAGES = ['Départ', 'Mouvement', 'Retour'] as const
const STAGE_TEXT: Record<string, readonly [string, string, string]> = {
  'bench-press': ['Barre au-dessus de la poitrine, pieds ancrés au sol.', 'Descendre la barre jusqu’à la poitrine en contrôlant.', 'Pousser la barre vers le haut sans rebondir.'],
  'incline-dumbbell-press': ['Haltères au-dessus du haut de la poitrine, banc incliné.', 'Descendre les haltères de chaque côté du buste.', 'Pousser en suivant la même trajectoire contrôlée.'],
  'pull-up': ['Bras tendus, mains fixes sur la barre.', 'Tirer le corps vers la barre sans élan.', 'Redescendre en contrôlant, mains toujours fixées.'],
  'barbell-row': ['Buste incliné, dos stable, barre sous les épaules.', 'Tirer la barre vers le bas du ventre.', 'Redescendre la barre en tendant les bras.'],
  'lat-pulldown': ['Bras élevés, mains sur la barre, câble tendu.', 'Tirer la barre vers le haut de la poitrine.', 'Remonter les bras sans relâcher le câble.'],
  'overhead-press': ['Barre au niveau des épaules, tronc gainé.', 'Pousser la barre au-dessus de la tête.', 'Redescendre la barre au niveau des épaules.'],
  'lateral-raise': ['Haltères près des cuisses, épaules basses.', 'Lever les bras jusqu’à hauteur des épaules.', 'Redescendre les haltères sans élan.'],
  'barbell-curl': ['Bras allongés, coudes près du corps.', 'Fléchir les coudes pour monter la barre.', 'Étendre les bras lentement sans déplacer les coudes.'],
  'barbell-squat': ['Debout, barre posée sur le haut du dos.', 'Fléchir hanches et genoux, pieds stables.', 'Pousser le sol pour revenir debout.'],
  'leg-press': ['Genoux fléchis, pieds posés sur le plateau.', 'Pousser le plateau en gardant le bassin appuyé.', 'Revenir en contrôlant, sans verrouiller les genoux.'],
  'romanian-deadlift': ['Debout, barre proche des cuisses.', 'Pousser les hanches vers l’arrière, barre près des jambes.', 'Se redresser par extension de hanche, dos stable.'],
  'hip-thrust': ['Haut du dos sur le banc, bassin bas, pieds ancrés.', 'Monter le bassin jusqu’à l’alignement du tronc.', 'Redescendre le bassin en contrôlant.'],
  crunch: ['Allongé, genoux fléchis, nuque neutre.', 'Enrouler le haut du tronc sans tirer la tête.', 'Redescendre lentement sur le tapis.'],
  plank: ['Maintenir tête, épaules, bassin et talons alignés.', 'Pose statique : respirer sans laisser tomber le bassin.', 'Pose statique : garder l’alignement et respirer.'],
}

const VIEW_LABELS: Record<ExerciseDemonstration['view'], string> = {
  side: 'Vue de côté',
  front: 'Vue de face',
  three_quarter: 'Vue trois-quarts',
  static: 'Pose statique',
}

const point = (x: number, y: number): Point => ({ x, y })
const pair = (a: Point, b: Point): Pair => [a, b]

function Stroke({ from, to, color = '#245fe5', width = 8, motionEnabled = true }: {
  from: Point; to: Point; color?: string; width?: number; motionEnabled?: boolean
}) {
  return <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" style={{ transition: motionEnabled ? 'all 650ms cubic-bezier(.2,.75,.25,1)' : 'none' }} />
}

function Joint({ at, color = '#e8b28a', radius = 4.5, motionEnabled = true, part }: {
  at: Point; color?: string; radius?: number; motionEnabled?: boolean; part?: string
}) {
  return <circle data-demo-part={part} cx={at.x} cy={at.y} r={radius} fill={color} stroke="#18335d" strokeWidth="1.5" style={{ transition: motionEnabled ? 'all 650ms cubic-bezier(.2,.75,.25,1)' : 'none' }} />
}

function Limb({ hip, knee, ankle, color, motionEnabled }: { hip: Point; knee: Point; ankle: Point; color: string; motionEnabled: boolean }) {
  return <g>
    <Stroke from={hip} to={knee} color={color} width={9} motionEnabled={motionEnabled} />
    <Stroke from={knee} to={ankle} color={color} width={8} motionEnabled={motionEnabled} />
    <Joint at={knee} color="#d69770" radius={4} motionEnabled={motionEnabled} part="knee" />
    <Joint at={ankle} color="#e8b28a" radius={3} motionEnabled={motionEnabled} part="ankle" />
  </g>
}

function Arm({ shoulder, elbow, wrist, color, motionEnabled }: { shoulder: Point; elbow: Point; wrist: Point; color: string; motionEnabled: boolean }) {
  return <g>
    <Stroke from={shoulder} to={elbow} color={color} width={7} motionEnabled={motionEnabled} />
    <Stroke from={elbow} to={wrist} color={color} width={6} motionEnabled={motionEnabled} />
    <Joint at={elbow} color="#d69770" radius={3.7} motionEnabled={motionEnabled} part="elbow" />
    <Joint at={wrist} color="#e8b28a" radius={3.2} motionEnabled={motionEnabled} part="hand" />
  </g>
}

function Person({ pose, motionEnabled, front = false, threeQuarter = false }: { pose: Pose; motionEnabled: boolean; front?: boolean; threeQuarter?: boolean }) {
  const far = '#7d9bd2'
  const near = '#245fe5'
  const width = front ? 7 : threeQuarter ? 5 : 0
  const [rawShoulderFar, rawShoulderNear] = pose.shoulders
  const [rawHipFar, rawHipNear] = pose.hips
  const [rawKneeFar, rawKneeNear] = pose.knees
  const [rawAnkleFar, rawAnkleNear] = pose.ankles
  const shoulderFar = point(rawShoulderFar.x - width, rawShoulderFar.y)
  const shoulderNear = point(rawShoulderNear.x + width, rawShoulderNear.y)
  const hipFar = point(rawHipFar.x - width / 2, rawHipFar.y)
  const hipNear = point(rawHipNear.x + width / 2, rawHipNear.y)
  const kneeFar = point(rawKneeFar.x - width / 2, rawKneeFar.y)
  const kneeNear = point(rawKneeNear.x + width / 2, rawKneeNear.y)
  const ankleFar = point(rawAnkleFar.x - width / 2, rawAnkleFar.y)
  const ankleNear = point(rawAnkleNear.x + width / 2, rawAnkleNear.y)
  const [elbowFar, elbowNear] = pose.elbows
  const [wristFar, wristNear] = pose.wrists
  const shoulderMid = point((shoulderFar.x + shoulderNear.x) / 2, (shoulderFar.y + shoulderNear.y) / 2)
  const hipMid = point((hipFar.x + hipNear.x) / 2, (hipFar.y + hipNear.y) / 2)
  return <g data-demo-part="body">
    <Limb hip={hipFar} knee={kneeFar} ankle={ankleFar} color={far} motionEnabled={motionEnabled} />
    <Limb hip={hipNear} knee={kneeNear} ankle={ankleNear} color={near} motionEnabled={motionEnabled} />
    <path d={`M ${shoulderFar.x} ${shoulderFar.y} L ${shoulderNear.x} ${shoulderNear.y} L ${hipNear.x} ${hipNear.y} L ${hipFar.x} ${hipFar.y} Z`} fill={front ? '#b7ccf3' : '#c7d7f2'} fillOpacity=".7" stroke="#245fe5" strokeWidth="3" strokeLinejoin="round" style={{ transition: motionEnabled ? 'all 650ms cubic-bezier(.2,.75,.25,1)' : 'none' }} />
    <Arm shoulder={shoulderFar} elbow={elbowFar} wrist={wristFar} color={far} motionEnabled={motionEnabled} />
    <Arm shoulder={shoulderNear} elbow={elbowNear} wrist={wristNear} color={near} motionEnabled={motionEnabled} />
    <Stroke from={shoulderMid} to={hipMid} color="#245fe5" width={3} motionEnabled={motionEnabled} />
    <circle cx={pose.head.x} cy={pose.head.y} r="10" fill="#e8b28a" stroke="#18335d" strokeWidth="2" style={{ transition: motionEnabled ? 'all 650ms cubic-bezier(.2,.75,.25,1)' : 'none' }} />
    {front ? <path d={`M ${pose.head.x - 2} ${pose.head.y} h 4`} stroke="#18335d" strokeWidth="1.5" /> : <path d={`M ${pose.head.x + 8} ${pose.head.y + 2} l 3 2`} stroke="#18335d" strokeWidth="1.5" />}
  </g>
}

function Barbell({ hands, motionEnabled, color = '#52647c' }: { hands: Pair; motionEnabled: boolean; color?: string }) {
  const [first, second] = hands
  const left = first.x < second.x ? first : second
  const right = first.x < second.x ? second : first
  const y = (left.y + right.y) / 2
  return <g data-demo-part="barbell" style={{ transition: motionEnabled ? 'all 650ms cubic-bezier(.2,.75,.25,1)' : 'none' }}>
    <line x1={left.x - 13} y1={y} x2={right.x + 13} y2={y} stroke={color} strokeWidth="4" strokeLinecap="round" />
    <rect x={left.x - 16} y={y - 11} width="6" height="22" rx="2" fill={color} />
    <rect x={right.x + 10} y={y - 11} width="6" height="22" rx="2" fill={color} />
  </g>
}

function Dumbbell({ at, motionEnabled }: { at: Point; motionEnabled: boolean }) {
  return <g transform={`translate(${at.x} ${at.y})`} style={{ transition: motionEnabled ? 'all 650ms cubic-bezier(.2,.75,.25,1)' : 'none' }}>
    <rect x="-10" y="-2" width="20" height="4" rx="2" fill="#52647c" />
    <rect x="-12" y="-6" width="5" height="12" rx="2" fill="#52647c" />
    <rect x="7" y="-6" width="5" height="12" rx="2" fill="#52647c" />
  </g>
}

function stagePose(animationKey: string, stage: Stage): Pose {
  const upper = (head: Point, shoulder: Point, hip: Point, elbows: Pair, wrists: Pair, knees: Pair, ankles: Pair): Pose => ({
    head,
    shoulders: pair(point(shoulder.x - 4, shoulder.y), point(shoulder.x + 4, shoulder.y)),
    hips: pair(point(hip.x - 3, hip.y), point(hip.x + 3, hip.y)),
    elbows, wrists, knees, ankles,
  })
  switch (animationKey) {
    case 'bench-press': {
      const barY = stage === 1 ? 101 : 65
      return upper(point(58, 111), point(92, 116), point(145, 121),
        pair(point(99, stage === 1 ? 111 : 91), point(133, stage === 1 ? 111 : 91)),
        pair(point(102, barY), point(142, barY)),
        pair(point(168, 130), point(174, 132)), pair(point(198, 147), point(204, 149)))
    }
    case 'incline-dumbbell-press': {
      const lower = stage === 1
      return upper(point(62, 78), point(91, 93), point(136, 119),
        pair(point(lower ? 76 : 82, lower ? 92 : 70), point(lower ? 115 : 122, lower ? 98 : 73)),
        pair(point(lower ? 72 : 78, lower ? 111 : 48), point(lower ? 126 : 133, lower ? 116 : 52)),
        pair(point(163, 137), point(169, 140)), pair(point(191, 153), point(198, 155)))
    }
    case 'pull-up': {
      const raised = stage === 1
      const y = raised ? 51 : 70
      const elbowY = raised ? 42 : 52
      return upper(point(126, raised ? 31 : 52), point(126, y), point(126, y + 41),
        pair(point(106, elbowY), point(146, elbowY)),
        pair(point(101, 32), point(151, 32)),
        pair(point(116, y + 75), point(136, y + 75)),
        pair(point(112, y + 101), point(140, y + 101)))
    }
    case 'barbell-row': {
      const pull = stage === 1
      const shoulder = point(119, 80)
      return upper(point(110, 58), shoulder, point(148, 112),
        pair(point(pull ? 105 : 105, pull ? 101 : 117), point(pull ? 141 : 143, pull ? 103 : 119)),
        pair(point(101, pull ? 109 : 145), point(151, pull ? 109 : 145)),
        pair(point(155, 139), point(160, 141)), pair(point(178, 160), point(185, 160)))
    }
    case 'lat-pulldown': {
      const pulled = stage === 1
      const barY = pulled ? 94 : 48
      return upper(point(110, 54), point(121, 79), point(126, 119),
        pair(point(97, pulled ? 78 : 60), point(145, pulled ? 78 : 60)),
        pair(point(82, barY), point(160, barY)),
        pair(point(151, 138), point(157, 139)), pair(point(183, 151), point(190, 151)))
    }
    case 'overhead-press': {
      const overhead = stage === 1
      const barY = overhead ? 29 : 74
      return upper(point(125, 42), point(125, 76), point(125, 119),
        pair(point(103, overhead ? 48 : 75), point(147, overhead ? 48 : 75)),
        pair(point(102, barY), point(148, barY)),
        pair(point(115, 142), point(135, 142)), pair(point(111, 162), point(145, 162)))
    }
    case 'lateral-raise': {
      const raised = stage === 1
      return upper(point(125, 43), point(125, 78), point(125, 116),
        pair(point(raised ? 91 : 105, raised ? 69 : 94), point(raised ? 159 : 145, raised ? 69 : 94)),
        pair(point(raised ? 72 : 101, raised ? 64 : 119), point(raised ? 178 : 149, raised ? 64 : 119)),
        pair(point(117, 140), point(133, 140)), pair(point(113, 161), point(138, 161)))
    }
    case 'barbell-curl': {
      const curled = stage === 1
      return upper(point(125, 42), point(125, 76), point(125, 118),
        pair(point(107, 111), point(143, 111)),
        pair(point(105, curled ? 90 : 141), point(145, curled ? 90 : 141)),
        pair(point(116, 140), point(134, 140)), pair(point(111, 161), point(145, 161)))
    }
    case 'barbell-squat': {
      const squat = stage === 1
      return upper(point(125, squat ? 54 : 42), point(squat ? 120 : 125, squat ? 82 : 72), point(squat ? 119 : 125, squat ? 121 : 112),
        pair(point(100, squat ? 82 : 63), point(149, squat ? 82 : 63)),
        pair(point(95, squat ? 69 : 58), point(155, squat ? 69 : 58)),
        pair(point(squat ? 97 : 116, squat ? 142 : 139), point(squat ? 137 : 135, squat ? 143 : 139)),
        pair(point(109, 162), point(149, 162)))
    }
    case 'leg-press': {
      const extended = stage === 1
      const ankle = extended ? point(211, 56) : point(185, 87)
      return upper(point(81, 63), point(99, 88), point(116, 121),
        pair(point(91, 95), point(108, 99)), pair(point(89, 110), point(112, 112)),
        pair(point(extended ? 158 : 142, extended ? 108 : 122), point(extended ? 164 : 149, extended ? 111 : 124)),
        pair(point(ankle.x - 3, ankle.y), point(ankle.x + 3, ankle.y + 3)))
    }
    case 'romanian-deadlift': {
      const hinged = stage === 1
      return upper(point(hinged ? 91 : 124, hinged ? 73 : 42), point(hinged ? 109 : 125, hinged ? 98 : 73), point(hinged ? 136 : 125, 117),
        pair(point(hinged ? 105 : 108, hinged ? 116 : 105), point(hinged ? 131 : 143, hinged ? 119 : 105)),
        pair(point(hinged ? 119 : 105, hinged ? 137 : 127), point(hinged ? 150 : 145, hinged ? 139 : 127)),
        pair(point(hinged ? 129 : 118, hinged ? 143 : 139), point(hinged ? 145 : 134, hinged ? 143 : 139)),
        pair(point(111, 162), point(151, 162)))
    }
    case 'hip-thrust': {
      const raised = stage === 1
      const hipY = raised ? 94 : 127
      return upper(point(54, 107), point(81, 111), point(132, hipY),
        pair(point(96, raised ? 114 : 128), point(111, raised ? 116 : 130)),
        pair(point(102, raised ? 122 : 136), point(119, raised ? 124 : 138)),
        pair(point(156, 130), point(162, 132)), pair(point(184, 153), point(190, 153)))
    }
    case 'crunch': {
      const curled = stage === 1
      return upper(point(curled ? 69 : 55, curled ? 92 : 122), point(curled ? 92 : 83, curled ? 100 : 128), point(137, 130),
        pair(point(curled ? 101 : 91, curled ? 105 : 122), point(curled ? 111 : 101, curled ? 109 : 125)),
        pair(point(curled ? 119 : 110, curled ? 114 : 133), point(curled ? 126 : 118, curled ? 118 : 135)),
        pair(point(167, 142), point(173, 143)), pair(point(195, 153), point(201, 153)))
    }
    case 'plank':
    default:
      return upper(point(55, 113), point(83, 121), point(143, 127),
        pair(point(74, 136), point(82, 139)), pair(point(62, 148), point(76, 149)),
        pair(point(174, 132), point(180, 133)), pair(point(207, 137), point(213, 138)))
  }
}

function Floor() {
  return <><rect x="8" y="8" width="244" height="174" rx="18" fill="#f4f7fb" /><path d="M20 164 H240" stroke="#c5d2e2" strokeWidth="2" /></>
}

function Figure({ demonstration, stage, motionEnabled }: { demonstration: ExerciseDemonstration; stage: Stage; motionEnabled: boolean }) {
  const key = demonstration.animationKey
  const pose = stagePose(key, stage)
  const front = demonstration.view === 'front'
  const benchPress = key === 'bench-press'
  const inclinePress = key === 'incline-dumbbell-press'
  const pullUp = key === 'pull-up'
  const latPulldown = key === 'lat-pulldown'
  const legPress = key === 'leg-press'
  const hipThrust = key === 'hip-thrust'
  const crunch = key === 'crunch'
  const plank = key === 'plank'
  const isDumbbell = key === 'incline-dumbbell-press' || key === 'lateral-raise'
  const isBarbell = ['bench-press', 'barbell-row', 'overhead-press', 'barbell-curl', 'barbell-squat', 'romanian-deadlift'].includes(key)
  const barHands: Pair = key === 'barbell-squat'
    ? pair(point(95, stage === 1 ? 69 : 58), point(155, stage === 1 ? 69 : 58))
    : pose.wrists

  return <svg viewBox="0 0 260 190" aria-hidden="true" focusable="false" data-exercise-demo={key} data-stage={stage} data-view={demonstration.view} className="h-auto w-full max-w-md" xmlns="http://www.w3.org/2000/svg">
    <Floor />
    {benchPress ? <g>
      <path d="M43 128 H164 M58 128 V151 M153 128 V151" stroke="#8293aa" strokeWidth="6" strokeLinecap="round" fill="none" />
      <Person pose={pose} motionEnabled={motionEnabled} />
      <Barbell hands={pose.wrists} motionEnabled={motionEnabled} />
      <path d="M177 151 H207" stroke="#18335d" strokeWidth="5" strokeLinecap="round" />
    </g> : null}
    {inclinePress ? <g>
      <path d="M61 103 L148 142 M68 108 L63 137 M145 141 L160 160" stroke="#8293aa" strokeWidth="7" strokeLinecap="round" fill="none" />
      <Person pose={pose} motionEnabled={motionEnabled} threeQuarter={demonstration.view === 'three_quarter'} />
      <Dumbbell at={pose.wrists[0]} motionEnabled={motionEnabled} /><Dumbbell at={pose.wrists[1]} motionEnabled={motionEnabled} />
      <path d="M166 150 H198" stroke="#18335d" strokeWidth="5" strokeLinecap="round" />
    </g> : null}
    {pullUp ? <g>
      <path data-demo-part="fixed-pull-up-bar" d="M79 29 H173 M85 29 V40 M167 29 V40" stroke="#52647c" strokeWidth="5" strokeLinecap="round" fill="none" />
      <Person pose={pose} motionEnabled={motionEnabled} />
      <path d="M96 33 H106 M146 33 H156" stroke="#18335d" strokeWidth="4" strokeLinecap="round" />
    </g> : null}
    {latPulldown ? <g>
      <path d="M183 27 V138 H208 M55 138 H91 V35 H185 M88 120 H155 V127" stroke="#8798ad" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="122" cy="30" r="7" fill="#52647c" />
      <path data-demo-part="pulley-cable" d={`M122 30 L121 ${(pose.wrists[0].y + pose.wrists[1].y) / 2 - 2}`} stroke="#52647c" strokeWidth="2" style={{ transition: motionEnabled ? 'all 650ms cubic-bezier(.2,.75,.25,1)' : 'none' }} />
      <Person pose={pose} motionEnabled={motionEnabled} />
      <Barbell hands={pose.wrists} motionEnabled={motionEnabled} />
    </g> : null}
    {key === 'barbell-row' ? <g>
      <Person pose={pose} motionEnabled={motionEnabled} />
      <Barbell hands={pose.wrists} motionEnabled={motionEnabled} />
    </g> : null}
    {key === 'overhead-press' || key === 'barbell-curl' || key === 'barbell-squat' || key === 'romanian-deadlift' ? <g>
      <Person pose={pose} motionEnabled={motionEnabled} />
      {isBarbell ? <Barbell hands={barHands} motionEnabled={motionEnabled} /> : null}
      {key === 'barbell-squat' ? <path d="M100 63 H150" stroke="#245fe5" strokeWidth="2" strokeDasharray="4 4" opacity=".4" /> : null}
    </g> : null}
    {front ? <g>
      <Person pose={pose} motionEnabled={motionEnabled} front />
      {isDumbbell ? <><Dumbbell at={pose.wrists[0]} motionEnabled={motionEnabled} /><Dumbbell at={pose.wrists[1]} motionEnabled={motionEnabled} /></> : null}
    </g> : null}
    {legPress ? <g>
      <path d="M156 45 L218 105 M166 38 L228 98" stroke="#8798ad" strokeWidth="6" strokeLinecap="round" />
      <path d="M75 104 L96 139 H144" stroke="#8293aa" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d={`M${pose.ankles[0].x - 8} ${pose.ankles[0].y - 8} l 25 -17 l 10 8 l -25 18 Z`} fill="#52647c" stroke="#34465f" strokeWidth="2" style={{ transition: motionEnabled ? 'all 650ms cubic-bezier(.2,.75,.25,1)' : 'none' }} />
      <Person pose={pose} motionEnabled={motionEnabled} />
    </g> : null}
    {hipThrust ? <g>
      <path d="M81 111 H120 V146 M83 111 V145" stroke="#8293aa" strokeWidth="7" strokeLinecap="round" fill="none" />
      <Person pose={pose} motionEnabled={motionEnabled} />
      <Barbell hands={pair(point(116, stage === 1 ? 94 : 127), point(146, stage === 1 ? 94 : 127))} motionEnabled={motionEnabled} />
    </g> : null}
    {crunch ? <g>
      <path d="M24 157 H238" stroke="#91a7c4" strokeWidth="7" strokeLinecap="round" />
      <Person pose={pose} motionEnabled={motionEnabled} />
    </g> : null}
    {plank ? <g>
      <path d="M24 157 H238" stroke="#91a7c4" strokeWidth="7" strokeLinecap="round" />
      <Person pose={pose} motionEnabled={false} />
      <path d="M55 108 L212 137" stroke="#16a36a" strokeWidth="2" strokeDasharray="5 4" />
      <circle cx="55" cy="108" r="3" fill="#16a36a" /><circle cx="212" cy="137" r="3" fill="#16a36a" />
    </g> : null}
    {key === 'lateral-raise' ? <path d="M66 65 H184" stroke="#16a36a" strokeWidth="2" strokeDasharray="5 4" opacity=".7" /> : null}
    <text x="20" y="27" fill="#647084" fontSize="9" fontWeight="700">{demonstration.view === 'static' ? 'POSE STATIQUE' : `${VIEW_LABELS[demonstration.view].toUpperCase()} · ${STAGES[stage].toUpperCase()}`}</text>
  </svg>
}

export default function ExerciseDemoPlayer({ demonstration }: { demonstration: ExerciseDemonstration }) {
  const reducedMotion = useReducedMotion()
  const [playing, setPlaying] = useState(false)
  const [stage, setStage] = useState<Stage>(0)
  const [speed, setSpeed] = useState(1)
  const allowed = ANIMATION_KEYS.has(demonstration.animationKey)
  const staticPose = demonstration.view === 'static' || demonstration.durationMs === 0
  const phaseText = STAGE_TEXT[demonstration.animationKey] ?? [demonstration.accessibilityLabel, demonstration.accessibilityLabel, demonstration.accessibilityLabel]
  const stageDescription = staticPose ? phaseText[1] : phaseText[stage]

  useEffect(() => {
    if (!playing || reducedMotion || staticPose || !allowed) return
    const phaseDuration = Math.max(1, demonstration.durationMs / 3 / speed)
    const timer = window.setTimeout(() => {
      if (stage === 2) setPlaying(false)
      else setStage((current) => Math.min(2, current + 1) as Stage)
    }, phaseDuration)
    return () => window.clearTimeout(timer)
  }, [playing, reducedMotion, staticPose, allowed, speed, stage, demonstration.durationMs])

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
    setSpeed(1)
  }, [demonstration.id])

  const startOrPause = () => {
    if (playing) {
      setPlaying(false)
      return
    }
    if (stage === 2) setStage(0)
    setPlaying(true)
  }
  const replay = () => {
    setStage(0)
    setPlaying(!reducedMotion && !staticPose && allowed)
  }

  return <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5" aria-label={`Démonstration : ${demonstration.accessibilityLabel}`}>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-accent">Démonstration guidée</p><h3 className="mt-1 font-semibold">{staticPose ? 'Maintien statique' : 'Mouvement en 3 étapes'}</h3></div>
      <span className="rounded-full bg-surface2 px-2.5 py-1 text-xs text-muted">{staticPose ? 'Pose statique' : reducedMotion ? 'Mode statique' : 'Animation vectorielle'}</span>
    </div>
    {allowed ? <div className="mt-3 flex justify-center"><Figure demonstration={demonstration} stage={stage} motionEnabled={!reducedMotion} /></div> : <p className="mt-4 rounded-xl bg-surface2 p-4 text-sm text-muted">Démonstration animée indisponible pour le moment. Les consignes écrites restent disponibles.</p>}
    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted" aria-live="polite" aria-atomic="true" role="status"><span className="sr-only">{staticPose ? 'Pose statique. ' : `${STAGES[stage]}. `}</span>{stageDescription}</p>
    {!staticPose ? <>
      {!reducedMotion ? <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={!allowed} onClick={startOrPause} className="gym-action inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:cursor-not-allowed disabled:opacity-50" aria-pressed={playing} aria-label={playing ? 'Mettre en pause la démonstration' : 'Lire la démonstration'}>
          {playing ? <Pause size={16} /> : <Play size={16} />}{playing ? 'Pause' : 'Lire'}
        </button>
        <button type="button" disabled={!allowed} onClick={replay} className="gym-action inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold disabled:opacity-50"><RotateCcw size={16} />Rejouer</button>
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm"><span>Vitesse</span><select value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="bg-transparent py-2" aria-label="Vitesse de l’animation" disabled={!allowed}><option value={0.5}>0,5×</option><option value={1}>1×</option><option value={1.5}>1,5×</option></select></label>
      </div> : <p className="mt-4 text-xs leading-5 text-muted">Mouvement réduit actif : choisis manuellement une étape pour consulter la pose statique.</p>}
      <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Choisir une étape de la démonstration">
        {STAGES.map((name, index) => <button key={name} type="button" onClick={() => { setPlaying(false); setStage(index as Stage) }} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-medium ${stage === index ? 'border-accent bg-surface2 text-accent' : 'border-line text-muted'}`} aria-pressed={stage === index}>{name}</button>)}
      </div>
    </> : <p className="mt-3 text-xs leading-5 text-muted">Pose de référence sans animation ni commandes de lecture. Maintiens l’alignement et respire calmement.</p>}
  </section>
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true)
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])
  return reduced
}
