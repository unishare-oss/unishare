import type { MotionValue } from 'framer-motion'
import { MOVES, type MoveRig, type Prop } from './noto-moves'
import {
  MOUTH,
  REST,
  SPRINGS,
  type NotoMood,
  type Pose,
  type PoseKey,
  type PoseSprings,
} from './noto-pose'

/* Every SVG element the rig drives, found by its data-part attribute. */
const PART_NAMES = [
  'whole',
  'torso',
  'shadow',
  'legL',
  'legR',
  'shoeL',
  'shoeR',
  'fold',
  'brows',
  'browL',
  'browR',
  'eyes',
  'eyeL',
  'eyeR',
  'pupilL',
  'pupilR',
  'happy',
  'shut',
  'blush',
  'mouthFill',
  'mouthLine',
  'mouthClip',
  'tongue',
  'armL',
  'armR',
  'handL',
  'handR',
  'fingerL',
  'fingerR',
  'sweat',
  'dots',
  'zzz',
] as const
type Parts = Record<(typeof PART_NAMES)[number], SVGElement>

/* With reduced motion the body never moves: no hops, throws, leans or bobbing. */
const BODY_KEYS = new Set<PoseKey>(['x', 'y', 'rot', 'squash', 'tuck', 'wiggle'])

const SQUASH_STIFFNESS = SPRINGS.squash.stiffness
const KICK_MS = 40
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'
const CONFETTI_COLOURS = ['#ff8a1f', '#2f6fe0', '#1d9a55', '#ffc27d', '#ff7d9a']
const DEFAULT_BREATH_PERIOD = 3.6
const DEFAULT_BREATH_AMPLITUDE = 0.012

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))
const round2 = (n: number) => Math.round(n * 100) / 100

/** Thrown out of a move's waits when a newer move has started, so the old one stops. */
const INTERRUPTED = Symbol('interrupted')

/* Where an arm ends: a quadratic from the shoulder, plus the hand's position and angle. */
function armGeometry(side: -1 | 1, angle: number, bend: number, reach: number, lag: number) {
  const shoulder = side < 0 ? [58, 108] : [142, 108]
  const rad = (angle * Math.PI) / 180
  const length = 32 * reach
  let dirX = side * Math.sin(rad)
  let dirY = Math.cos(rad)
  let perpX = side * Math.cos(rad)
  let perpY = -Math.sin(rad)
  const lagRad = (lag * Math.PI) / 180
  const lagCos = Math.cos(lagRad)
  const lagSin = Math.sin(lagRad)
  ;[dirX, dirY] = [dirX * lagCos - dirY * lagSin, dirX * lagSin + dirY * lagCos]
  ;[perpX, perpY] = [perpX * lagCos - perpY * lagSin, perpX * lagSin + perpY * lagCos]
  const handX = shoulder[0] + dirX * length
  const handY = shoulder[1] + dirY * length
  const ctrlX = shoulder[0] + (dirX * length) / 2 + perpX * bend
  const ctrlY = shoulder[1] + (dirY * length) / 2 + perpY * bend
  return {
    d: `M${shoulder[0]} ${shoulder[1]}Q${round2(ctrlX)} ${round2(ctrlY)} ${round2(handX)} ${round2(handY)}`,
    handX,
    handY,
    deg: (Math.atan2(-dirX, dirY) * 180) / Math.PI,
  }
}

type RigOptions = {
  svg: SVGSVGElement
  burst: HTMLDivElement
  springs: PoseSprings
  lag: MotionValue<number>
  fold: MotionValue<number>
  reduced: () => boolean
  line: () => string | undefined
  onConfetti: () => void
  onSay: (shown: string | null) => void
}

/* The rig: the preview's spring puppet, driven through framer-motion springs. Every pose
   write goes through set(), which jumps instead of springing when motion is reduced. */
export function createRig({
  svg,
  burst,
  springs,
  lag,
  fold,
  reduced,
  line,
  onConfetti,
  onSay,
}: RigOptions) {
  const parts = Object.fromEntries(
    PART_NAMES.map((name) => [name, svg.querySelector(`[data-part="${name}"]`)]),
  ) as Parts
  const stars = [...svg.querySelectorAll<SVGPathElement>('[data-part="star"]')]

  const timers = new Set<ReturnType<typeof setTimeout>>()
  const schedule = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.delete(id)
      fn()
    }, ms)
    timers.add(id)
  }

  const targets: Pose = { ...REST }
  let moveId = 0
  let follow = true
  let lidHold = false
  let breathPeriod = DEFAULT_BREATH_PERIOD
  let breathAmplitude = DEFAULT_BREATH_AMPLITUDE
  let lastPointer = 0
  let visible = true
  let prevY = 0
  let destroyed = false

  const set = (pose: Pose) => {
    const isReduced = reduced()
    for (const key of Object.keys(pose) as PoseKey[]) {
      const value = pose[key] as number
      targets[key] = value
      if (isReduced) {
        if (!BODY_KEYS.has(key)) springs[key].jump(value)
      } else springs[key].set(value)
    }
  }
  const snap = (pose: Pose) => {
    for (const key of Object.keys(pose) as PoseKey[]) springs[key].jump(pose[key] as number)
  }
  const mouth = (name: keyof typeof MOUTH, overrides: Pose = {}) =>
    set({ ...MOUTH[name], ...overrides })
  const rest = ({ follow: followPointer = true } = {}) => {
    set(REST)
    follow = followPointer
  }

  const showProp = (
    name: Prop,
    on: boolean,
    frames?: Keyframe[],
    options?: KeyframeAnimationOptions,
  ) => {
    const node = parts[name]
    node.getAnimations?.().forEach((a) => a.cancel())
    node.style.opacity = on ? '1' : '0'
    if (on && frames && !reduced())
      node.animate?.(frames, { duration: 300, easing: EASE_OUT, fill: 'forwards', ...options })
  }
  const clearExtras = () => {
    ;(['sweat', 'dots', 'zzz'] as const).forEach((name) => showProp(name, false))
    stars.forEach((star) => {
      star.getAnimations?.().forEach((a) => a.cancel())
      star.style.opacity = '0'
    })
  }
  const starBurst = () => {
    stars.forEach((star, i) =>
      star.animate?.(
        [
          { opacity: 0, transform: 'scale(0.4) rotate(-40deg)' },
          { opacity: 1, transform: 'scale(1.15) rotate(0deg)', offset: 0.35 },
          { opacity: 1, transform: 'scale(1)', offset: 0.7 },
          { opacity: 0, transform: 'scale(0.6) rotate(30deg)' },
        ],
        { duration: 900, delay: 80 + i * 90, easing: EASE_OUT, fill: 'both' },
      ),
    )
  }
  const confetti = () => {
    for (let i = 0; i < 22; i++) {
      const piece = document.createElement('i')
      piece.style.background = CONFETTI_COLOURS[i % CONFETTI_COLOURS.length]
      burst.appendChild(piece)
      const angle = ((-150 + Math.random() * 120) * Math.PI) / 180
      const speed = 90 + Math.random() * 150
      const dx = Math.cos(angle) * speed
      const dy = Math.sin(angle) * speed
      const anim = piece.animate?.(
        [
          { transform: 'translate(0, 0) rotate(0deg) scale(0.6)', opacity: 1 },
          {
            transform: `translate(${dx}px, ${dy}px) rotate(${Math.random() * 360}deg) scale(1)`,
            opacity: 1,
            offset: 0.45,
          },
          {
            transform: `translate(${dx * 1.25}px, ${dy + 200}px) rotate(${Math.random() * 720}deg) scale(0.9)`,
            opacity: 0,
          },
        ],
        { duration: 1200 + Math.random() * 500, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)' },
      )
      if (anim)
        anim.finished.then(
          () => piece.remove(),
          () => piece.remove(),
        )
      else piece.remove()
    }
  }
  const celebrate = () => {
    if (reduced()) return
    onConfetti()
    confetti()
    starBurst()
  }
  const blink = () => {
    if (lidHold) return
    set({ lid: 1 })
    schedule(() => {
      if (!lidHold) set({ lid: 0 })
    }, 75)
  }

  /* One move at a time: each play() takes a new moveId, and the old move's waits throw. */
  const waitFor = (id: number) => (ms: number) =>
    new Promise<void>((resolve, reject) =>
      schedule(() => (id === moveId ? resolve() : reject(INTERRUPTED)), ms),
    )

  const moveRig: MoveRig = {
    whole: parts.whole,
    set,
    snap,
    mouth,
    rest,
    holdLids: (on) => {
      lidHold = on
    },
    setBreathing: (period, amplitude) => {
      breathPeriod = period
      breathAmplitude = amplitude
    },
    showProp,
    celebrate,
    reduced,
    line,
    onSay,
  }

  const play = async (name: NotoMood) => {
    const id = ++moveId
    clearExtras()
    onSay(null)
    lidHold = false
    breathPeriod = DEFAULT_BREATH_PERIOD
    breathAmplitude = DEFAULT_BREATH_AMPLITUDE
    rest({ follow: false })
    try {
      await MOVES[name](moveRig, waitFor(id))
    } catch (e) {
      if (e === INTERRUPTED) return
      throw e
    }
    if (id !== moveId || name === 'sleep') return
    onSay(null)
    clearExtras()
    rest()
  }

  /* Landing speed kicks the squash spring. framer-motion springs can't take a velocity
     impulse, so dip the target for KICK_MS: the same push, spread over a few frames. */
  const kick = (amount: number) => {
    springs.squash.set((targets.squash ?? 1) - amount / (SQUASH_STIFFNESS * (KICK_MS / 1000)))
    schedule(() => springs.squash.set(targets.squash ?? 1), KICK_MS)
  }

  const render = (now: number) => {
    if (!visible) return
    const isReduced = reduced()
    const rawY = springs.y.get()
    if (!isReduced && prevY < -3 && rawY >= -0.5 && springs.y.getVelocity() > 120)
      kick(Math.min(4, springs.y.getVelocity() * 0.006))
    prevY = rawY

    const breath = isReduced
      ? 0
      : Math.sin((now / 1000) * ((2 * Math.PI) / breathPeriod)) * breathAmplitude
    let bodyY = rawY
    let squash = springs.squash.get() * (1 + breath)
    // Overshoot into the floor becomes squash; Noto never sinks.
    if (bodyY > 0) {
      squash *= 1 - Math.min(0.25, bodyY * 0.012)
      bodyY = 0
    }
    const squashX = 1 + (1 - squash) * 0.85
    const bodyX = springs.x.get()
    parts.whole.setAttribute(
      'transform',
      `translate(${round2(bodyX)} ${round2(bodyY)}) rotate(${round2(springs.rot.get())} 100 172)`,
    )
    parts.torso.setAttribute(
      'transform',
      `translate(100 150) scale(${round2(squashX)} ${round2(squash)}) translate(-100 -150)`,
    )

    // Legs: hips ride the torso, feet stay planted (or tuck when airborne).
    const tuck = springs.tuck.get()
    const spread = clamp((1 - squash) * 16, -4, 10)
    const knee = 2 + Math.max(0, 1 - squash) * 28 + tuck * 6
    for (const [side, leg, shoe] of [
      [-1, parts.legL, parts.shoeL],
      [1, parts.legR, parts.shoeR],
    ] as const) {
      const hipX = 100 + side * 14 * squashX
      const hipY = 150
      const footX = 100 + side * (18 + spread)
      const footY = 171 - tuck * 11
      leg.setAttribute(
        'd',
        `M${round2(hipX)} ${hipY}Q${round2((hipX + footX) / 2 + side * knee)} ${round2((hipY + footY) / 2)} ${round2(footX)} ${round2(footY)}`,
      )
      shoe.setAttribute(
        'transform',
        `translate(${round2(footX + side * 3)} ${round2(footY + 2)}) rotate(${round2(side * tuck * 14)})`,
      )
    }
    const lift = clamp(-rawY / 80, 0, 0.55)
    parts.shadow.setAttribute(
      'transform',
      `translate(${round2(100 + bodyX)} 178) scale(${round2(1 - lift)}) translate(-100 -178)`,
    )
    parts.shadow.setAttribute('opacity', String(round2(0.14 * (1 - lift))))

    // The fold corner flaps perpendicular to its hinge (120,58)-(142,80).
    const foldFactor = clamp(fold.get(), 0.55, 1.45)
    const foldHalf = (foldFactor - 1) * 0.5
    const foldDiag = 1 + foldHalf
    const foldOff = -foldHalf
    parts.fold.setAttribute(
      'transform',
      `matrix(${round2(foldDiag)} ${round2(foldOff)} ${round2(foldOff)} ${round2(foldDiag)} ${round2(131 - (foldDiag * 131 + foldOff * 69))} ${round2(69 - (foldOff * 131 + foldDiag * 69))})`,
    )

    // Eyes
    const lid = springs.lid.get()
    const lidScaleY = Math.max(0.08, 1 - lid)
    const happy = clamp(springs.happy.get(), 0, 1)
    parts.eyeL.setAttribute(
      'transform',
      `translate(84 98) scale(1 ${round2(lidScaleY)}) translate(-84 -98)`,
    )
    parts.eyeR.setAttribute(
      'transform',
      `translate(112 98) scale(1 ${round2(lidScaleY)}) translate(-112 -98)`,
    )
    const pupil = `translate(${round2(clamp(springs.pupilX.get(), -3.6, 3.6))} ${round2(clamp(springs.pupilY.get(), -4.4, 4.4))})`
    parts.pupilL.setAttribute('transform', pupil)
    parts.pupilR.setAttribute('transform', pupil)
    const shut = clamp((lid - 0.8) * 5, 0, 1)
    parts.eyes.setAttribute('opacity', String(round2((1 - happy) * (1 - shut))))
    parts.happy.setAttribute('opacity', String(round2(happy)))
    parts.shut.setAttribute('opacity', String(round2(shut * (1 - happy))))

    // Brows: >0 raised, <0 worried (inner ends up).
    const browValue = springs.brow.get()
    const browUp = Math.max(0, browValue) * 3
    const browWorry = Math.max(0, -browValue)
    parts.browL.setAttribute(
      'd',
      `M76 ${round2(84 - browUp + browWorry)}Q83 ${round2(80 - browUp - browWorry * 2)} 91 ${round2(82 - browUp - browWorry * 4)}`,
    )
    parts.browR.setAttribute(
      'd',
      `M124 ${round2(84 - browUp + browWorry)}Q117 ${round2(80 - browUp - browWorry * 2)} 109 ${round2(82 - browUp - browWorry * 4)}`,
    )
    parts.brows.setAttribute('opacity', String(round2(clamp(springs.browOn.get(), 0, 1))))
    parts.blush.setAttribute('opacity', String(round2(clamp(springs.blush.get(), 0, 1) * 0.65)))

    // Mouth: width, curve, open.
    const mouthWidth = springs.mouthWidth.get()
    const mouthCurve = springs.mouthCurve.get()
    const mouthOpen = Math.max(0, springs.mouthOpen.get())
    const cornerY = 117 - mouthCurve * 1.5
    const upperY = cornerY + mouthCurve * 5
    const lowerY = upperY + mouthOpen * 16
    const mouthPath = `M${round2(100 - mouthWidth)} ${round2(cornerY)}Q100 ${round2(upperY)} ${round2(100 + mouthWidth)} ${round2(cornerY)}Q100 ${round2(lowerY)} ${round2(100 - mouthWidth)} ${round2(cornerY)}Z`
    parts.mouthLine.setAttribute('d', mouthPath)
    parts.mouthFill.setAttribute('d', mouthPath)
    parts.mouthClip.setAttribute('d', mouthPath)
    parts.mouthFill.setAttribute('fill-opacity', String(round2(clamp(mouthOpen * 12, 0, 1))))
    parts.tongue.setAttribute(
      'cy',
      String(round2(cornerY + (mouthCurve * 5 + mouthOpen * 16) * 0.78)),
    )
    parts.tongue.setAttribute('rx', String(round2(mouthWidth * 0.55)))
    parts.tongue.setAttribute('ry', String(round2(mouthOpen * 6)))
    parts.tongue.setAttribute('opacity', String(round2(clamp(mouthOpen * 5, 0, 1))))

    // Arms trail the lean.
    const trail = (lag.get() - springs.rot.get()) * 1.4
    const leftArm = armGeometry(
      -1,
      springs.armAngleL.get(),
      springs.armBendL.get(),
      springs.armReachL.get(),
      trail,
    )
    const rightArm = armGeometry(
      1,
      springs.armAngleR.get(),
      springs.armBendR.get(),
      springs.armReachR.get(),
      trail,
    )
    const wiggle = springs.wiggle.get()
    parts.armL.setAttribute('d', leftArm.d)
    parts.armR.setAttribute('d', rightArm.d)
    parts.handL.setAttribute(
      'transform',
      `translate(${round2(leftArm.handX)} ${round2(leftArm.handY)}) rotate(${round2(leftArm.deg - wiggle)}) scale(-1 1)`,
    )
    parts.handR.setAttribute(
      'transform',
      `translate(${round2(rightArm.handX)} ${round2(rightArm.handY)}) rotate(${round2(rightArm.deg + wiggle)})`,
    )
    parts.fingerR.setAttribute(
      'height',
      String(round2(6 + 13 * clamp(springs.pointFinger.get(), 0, 1))),
    )
  }

  /* Idle life: blinks every 2.4–5.8 s, small glances when the pointer is still, and eyes plus
     a slight lean that follow the pointer. */
  const blinkLoop = () =>
    schedule(
      () => {
        if (!reduced()) blink()
        if (!reduced() && Math.random() < 0.18) schedule(blink, 220)
        blinkLoop()
      },
      2400 + Math.random() * 3400,
    )
  const glanceLoop = () =>
    schedule(
      () => {
        if (follow && !reduced() && performance.now() - lastPointer > 2500)
          set({ pupilX: -2.5 + Math.random() * 5, pupilY: -2 + Math.random() * 4 })
        glanceLoop()
      },
      1600 + Math.random() * 2200,
    )
  blinkLoop()
  glanceLoop()

  const onPointer = (e: PointerEvent) => {
    if (!follow || !visible || reduced()) return
    const box = svg.getBoundingClientRect()
    const offsetX = e.clientX - (box.left + box.width / 2)
    const offsetY = e.clientY - (box.top + box.height * 0.48)
    const distance = Math.hypot(offsetX, offsetY) || 1
    const strength = clamp(distance / 260, 0, 1)
    set({
      pupilX: (offsetX / distance) * 3.4 * strength,
      pupilY: (offsetY / distance) * 4 * strength,
      rot: clamp(offsetX / 500, -1, 1) * 2.5,
    })
    lastPointer = performance.now()
  }
  window.addEventListener('pointermove', onPointer, { passive: true })

  let observer: IntersectionObserver | undefined
  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    })
    observer.observe(svg)
  }

  const destroy = () => {
    destroyed = true
    moveId++
    timers.forEach(clearTimeout)
    timers.clear()
    window.removeEventListener('pointermove', onPointer)
    observer?.disconnect()
    clearExtras()
    burst.replaceChildren()
  }

  return { play, render: (now: number) => !destroyed && render(now), destroy }
}
