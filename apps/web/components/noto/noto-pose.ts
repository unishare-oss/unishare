import type { MotionValue } from 'framer-motion'

export type NotoMood = 'popIn' | 'wave' | 'point' | 'think' | 'nod' | 'cheer' | 'oops' | 'sleep'

/* Each rig part is its own spring. Response (s) and damping ratio come from the Noto README;
   with mass 1 they become stiffness (2π/response)² and damping 2·ratio·(2π/response). */
function spring(response: number, dampingRatio: number) {
  const omega = (2 * Math.PI) / response
  return { stiffness: omega * omega, damping: 2 * dampingRatio * omega, mass: 1 }
}

export const SPRINGS = {
  x: spring(0.38, 0.72),
  y: spring(0.34, 0.7),
  rot: spring(0.42, 0.7),
  lag: spring(0.6, 0.55),
  squash: spring(0.26, 0.42),
  arm: spring(0.3, 0.62),
  bend: spring(0.3, 0.6),
  reach: spring(0.3, 0.7),
  pointFinger: spring(0.18, 0.8),
  wiggle: spring(0.14, 0.45),
  tuck: spring(0.24, 0.7),
  eye: spring(0.1, 0.9),
  lid: spring(0.05, 1),
  happy: spring(0.16, 1),
  brow: spring(0.2, 0.8),
  browOn: spring(0.2, 1),
  mouthOpen: spring(0.07, 0.75),
  mouthCurve: spring(0.2, 0.8),
  mouthWidth: spring(0.2, 0.75),
  fold: spring(0.28, 0.32),
  blush: spring(0.4, 1),
}

export const REST = {
  x: 0,
  y: 0,
  rot: 0,
  squash: 1,
  armAngleL: 16,
  armAngleR: 16,
  armBendL: 6,
  armBendR: 6,
  armReachL: 1,
  armReachR: 1,
  pointFinger: 0,
  wiggle: 0,
  tuck: 0,
  pupilX: 1.2,
  pupilY: 1.4,
  lid: 0,
  happy: 0,
  brow: 0,
  browOn: 0,
  mouthOpen: 0,
  mouthCurve: 1,
  mouthWidth: 8,
  blush: 0.6,
}
export type PoseKey = keyof typeof REST
export type Pose = Partial<Record<PoseKey, number>>
export type PoseSprings = Record<PoseKey, MotionValue<number>>

export const MOUTH = {
  smile: { mouthOpen: 0, mouthCurve: 1, mouthWidth: 8 },
  grin: { mouthOpen: 0.42, mouthCurve: 1, mouthWidth: 10 },
  wide: { mouthOpen: 0.7, mouthCurve: 0.9, mouthWidth: 11 },
  flat: { mouthOpen: 0, mouthCurve: -0.05, mouthWidth: 4.5 },
  frown: { mouthOpen: 0.06, mouthCurve: -0.8, mouthWidth: 6 },
  o: { mouthOpen: 0.32, mouthCurve: 0, mouthWidth: 3.4 },
} satisfies Record<string, Pose>
