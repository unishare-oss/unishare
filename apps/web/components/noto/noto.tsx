'use client'

import {
  useAnimationFrame,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from 'framer-motion'
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

export type NotoMood = 'popIn' | 'wave' | 'point' | 'think' | 'nod' | 'cheer' | 'oops' | 'sleep'

type NotoProps = {
  mood: NotoMood
  /** One short line, shown in a bubble while Noto says it. */
  line?: string
  /** Called when Noto cheers, alongside its own confetti burst. */
  onConfetti?: () => void
  className?: string
}

/* Each rig part is its own spring. Response (s) and damping ratio come from the Noto README;
   with mass 1 they become stiffness (2π/response)² and damping 2·ratio·(2π/response). */
function spring(response: number, dampingRatio: number) {
  const w = (2 * Math.PI) / response
  return { stiffness: w * w, damping: 2 * dampingRatio * w, mass: 1 }
}

const SPRINGS = {
  x: spring(0.38, 0.72),
  y: spring(0.34, 0.7),
  rot: spring(0.42, 0.7),
  lag: spring(0.6, 0.55),
  sq: spring(0.26, 0.42),
  arm: spring(0.3, 0.62),
  bend: spring(0.3, 0.6),
  reach: spring(0.3, 0.7),
  ptR: spring(0.18, 0.8),
  wig: spring(0.14, 0.45),
  tuck: spring(0.24, 0.7),
  eye: spring(0.1, 0.9),
  lid: spring(0.05, 1),
  happy: spring(0.16, 1),
  brow: spring(0.2, 0.8),
  browOn: spring(0.2, 1),
  mo: spring(0.07, 0.75),
  mc: spring(0.2, 0.8),
  mw: spring(0.2, 0.75),
  fold: spring(0.28, 0.32),
  blush: spring(0.4, 1),
}

const REST = {
  x: 0,
  y: 0,
  rot: 0,
  sq: 1,
  aL: 16,
  aR: 16,
  bL: 6,
  bR: 6,
  rL: 1,
  rR: 1,
  ptR: 0,
  wig: 0,
  tuck: 0,
  ex: 1.2,
  ey: 1.4,
  lid: 0,
  happy: 0,
  brow: 0,
  browOn: 0,
  mo: 0,
  mc: 1,
  mw: 8,
  blush: 0.6,
}
type PoseKey = keyof typeof REST
type Pose = Partial<Record<PoseKey, number>>

const MOUTH = {
  smile: { mo: 0, mc: 1, mw: 8 },
  grin: { mo: 0.42, mc: 1, mw: 10 },
  wide: { mo: 0.7, mc: 0.9, mw: 11 },
  flat: { mo: 0, mc: -0.05, mw: 4.5 },
  frown: { mo: 0.06, mc: -0.8, mw: 6 },
  o: { mo: 0.32, mc: 0, mw: 3.4 },
} satisfies Record<string, Pose>

/* With reduced motion the body never moves: no hops, throws, leans or bobbing. */
const BODY_KEYS = new Set<string>(['x', 'y', 'rot', 'sq', 'tuck', 'wig'])

const SQ_STIFFNESS = SPRINGS.sq.stiffness
const KICK_MS = 40
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'
const CONFETTI_COLOURS = ['#ff8a1f', '#2f6fe0', '#1d9a55', '#ffc27d', '#ff7d9a']

const NAVY = '#14213d'
const ORANGE = '#ff8a1f'
const FOLD = '#ffc27d'
const CREAM = '#fff4e6'
const PINK = '#ff7d9a'
const BLUSH = '#ff5f8f'

const LIMB_STYLE: CSSProperties = { stroke: 'var(--noto-limb, #14213d)' }
const INK_STYLE: CSSProperties = { fill: 'var(--noto-limb, #14213d)' }
const SHADOW_STYLE: CSSProperties = { fill: 'var(--noto-shadow, #14213d)' }
const POP_STYLE: CSSProperties = { transformBox: 'fill-box', transformOrigin: 'center' }
const INK_POP_STYLE: CSSProperties = { ...INK_STYLE, ...POP_STYLE }

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const fmt = (n: number) => Math.round(n * 100) / 100

/** Thrown out of a move's waits when a newer move has started, so the old one stops. */
const INTERRUPTED = Symbol('interrupted')

type Springs = Record<PoseKey, MotionValue<number>>

type Parts = {
  whole: SVGGElement
  torso: SVGGElement
  shadow: SVGEllipseElement
  legL: SVGPathElement
  legR: SVGPathElement
  shoeL: SVGGElement
  shoeR: SVGGElement
  fold: SVGPathElement
  brows: SVGGElement
  browL: SVGPathElement
  browR: SVGPathElement
  eyes: SVGGElement
  eyeL: SVGGElement
  eyeR: SVGGElement
  pupL: SVGGElement
  pupR: SVGGElement
  happy: SVGGElement
  shut: SVGGElement
  blush: SVGGElement
  mfill: SVGPathElement
  mline: SVGPathElement
  mclip: SVGPathElement
  tongue: SVGEllipseElement
  armL: SVGPathElement
  armR: SVGPathElement
  handL: SVGGElement
  handR: SVGGElement
  fingerL: SVGRectElement
  fingerR: SVGRectElement
  sweat: SVGPathElement
  dots: SVGGElement
  zzz: SVGGElement
}

type Extra = 'sweat' | 'dots' | 'zzz'

function arm(side: -1 | 1, a: number, bend: number, reach: number, lag: number) {
  const s = side < 0 ? [58, 108] : [142, 108]
  const r = (a * Math.PI) / 180
  const L = 32 * reach
  let dx = side * Math.sin(r)
  let dy = Math.cos(r)
  let px = side * Math.cos(r)
  let py = -Math.sin(r)
  const lr = (lag * Math.PI) / 180
  const cl = Math.cos(lr)
  const sl = Math.sin(lr)
  ;[dx, dy] = [dx * cl - dy * sl, dx * sl + dy * cl]
  ;[px, py] = [px * cl - py * sl, px * sl + py * cl]
  const hx = s[0] + dx * L
  const hy = s[1] + dy * L
  const cx = s[0] + (dx * L) / 2 + px * bend
  const cy = s[1] + (dy * L) / 2 + py * bend
  return {
    d: `M${s[0]} ${s[1]}Q${fmt(cx)} ${fmt(cy)} ${fmt(hx)} ${fmt(hy)}`,
    hx,
    hy,
    deg: (Math.atan2(-dx, dy) * 180) / Math.PI,
  }
}

type RigOptions = {
  svg: SVGSVGElement
  burst: HTMLDivElement
  P: Springs
  lag: MotionValue<number>
  fold: MotionValue<number>
  reduced: () => boolean
  line: () => string | undefined
  onConfetti: () => void
  onSay: (shown: string | null) => void
}

/* The rig: the preview's spring puppet, driven through framer-motion springs. Every pose
   write goes through set(), which jumps instead of springing when motion is reduced. */
function createRig({ svg, burst, P, lag, fold, reduced, line, onConfetti, onSay }: RigOptions) {
  const part = <K extends keyof Parts>(k: K) =>
    svg.querySelector(`[data-part="${k}"]`) as unknown as Parts[K]
  const el = {} as Parts
  for (const k of [
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
    'pupL',
    'pupR',
    'happy',
    'shut',
    'blush',
    'mfill',
    'mline',
    'mclip',
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
  ] as const) {
    ;(el as Record<string, Element>)[k] = part(k)
  }
  const stars = [...svg.querySelectorAll<SVGPathElement>('[data-part="star"]')]

  const timers = new Set<ReturnType<typeof setTimeout>>()
  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.delete(id)
      fn()
    }, ms)
    timers.add(id)
  }

  const targets: Pose = { ...REST }
  let token = 0
  let follow = true
  let lidHold = false
  let breathPeriod = 3.6
  let breathAmp = 0.012
  let lastPointer = 0
  let visible = true
  let prevY = 0
  let destroyed = false

  const set = (pose: Pose) => {
    const r = reduced()
    for (const k of Object.keys(pose) as PoseKey[]) {
      const v = pose[k] as number
      targets[k] = v
      if (r) {
        if (!BODY_KEYS.has(k)) P[k].jump(v)
      } else P[k].set(v)
    }
  }
  const snap = (pose: Pose) => {
    for (const k of Object.keys(pose) as PoseKey[]) P[k].jump(pose[k] as number)
  }
  const mouth = (name: keyof typeof MOUTH, extra: Pose = {}) => set({ ...MOUTH[name], ...extra })
  const rest = () => {
    set(REST)
    follow = true
  }

  const extra = (
    name: Extra,
    on: boolean,
    frames?: Keyframe[],
    options?: KeyframeAnimationOptions,
  ) => {
    const n = el[name]
    n.getAnimations?.().forEach((a) => a.cancel())
    n.style.opacity = on ? '1' : '0'
    if (on && frames && !reduced())
      n.animate?.(frames, { duration: 300, easing: EASE_OUT, fill: 'forwards', ...options })
  }
  const clearExtras = () => {
    ;(['sweat', 'dots', 'zzz'] as const).forEach((k) => extra(k, false))
    stars.forEach((s) => {
      s.getAnimations?.().forEach((a) => a.cancel())
      s.style.opacity = '0'
    })
  }
  const starBurst = () => {
    if (reduced()) return
    stars.forEach((s, i) =>
      s.animate?.(
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
  const confetti = (n = 22) => {
    if (reduced()) return
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i')
      p.style.background = CONFETTI_COLOURS[i % CONFETTI_COLOURS.length]
      burst.appendChild(p)
      const a = ((-150 + Math.random() * 120) * Math.PI) / 180
      const v = 90 + Math.random() * 150
      const dx = Math.cos(a) * v
      const dy = Math.sin(a) * v
      const anim = p.animate?.(
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
          () => p.remove(),
          () => p.remove(),
        )
      else p.remove()
    }
  }
  const blink = () => {
    if (lidHold) return
    set({ lid: 1 })
    later(() => {
      if (!lidHold) set({ lid: 0 })
    }, 75)
  }

  /* One move at a time: each play() takes a new token, and the old move's waits throw. */
  const waitFor = (t: number) => (ms: number) =>
    new Promise<void>((resolve, reject) =>
      later(() => (t === token ? resolve() : reject(INTERRUPTED)), ms),
    )
  type Wait = ReturnType<typeof waitFor>

  /* Show the line in the bubble and open the mouth per letter; no line, no lip-sync. */
  const say = async (
    wait: Wait,
    o: { hold?: number; lips?: boolean; onBeat?: (n: number) => void } = {},
  ) => {
    const text = line()
    if (!text) return wait(o.hold ?? 900)
    if (reduced() || o.lips === false) {
      onSay(text)
      return wait(1000 + text.length * 28)
    }
    onSay('')
    let shown = ''
    let beats = 0
    for (const ch of text) {
      shown += ch
      onSay(shown)
      if (/[aeiouy]/i.test(ch))
        set({ mo: 0.38 + Math.random() * 0.3, mw: 7 + Math.random() * 2, mc: 0.6 })
      else if (/[a-z0-9]/i.test(ch)) set({ mo: 0.12, mw: 6.5, mc: 0.6 })
      else set({ mo: 0.02, mw: 7.5, mc: 0.9 })
      const pause = /[.,!?…]/.test(ch)
      if (pause) o.onBeat?.(++beats)
      await wait(pause ? 170 : 40)
    }
    mouth('smile')
    await wait(650)
  }

  const MOVES: Record<NotoMood, (wait: Wait) => Promise<void>> = {
    async popIn(wait) {
      if (!reduced()) {
        snap({ y: 140, sq: 1.22, aL: 50, aR: 50, tuck: 0.6 })
        el.whole.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: 'ease-out' })
        set({ y: -20, sq: 1.12, aL: 64, aR: 64 })
        mouth('o')
        await wait(230)
        set({ y: 0, sq: 1, tuck: 0, aL: 30, aR: 30 })
        await wait(260)
      }
      mouth('grin', { blush: 0.9 })
      await wait(380)
      mouth('smile')
      // Pop in, then wave.
      rest()
      follow = false
      await wait(240)
      await MOVES.wave(wait)
    },
    async wave(wait) {
      set({ rot: -4, aR: 158, bR: -10, blush: 0.9, ex: 2, ey: -0.6 })
      mouth('grin')
      await wait(240)
      for (let i = 0; i < 3; i++) {
        set({ wig: 24, aR: 166 })
        await wait(165)
        set({ wig: -20, aR: 146 })
        await wait(165)
      }
      set({ wig: 0 })
      await wait(120)
    },
    async point(wait) {
      set({ rot: -3, aR: 6, sq: 1.03, ex: 0, ey: 0 })
      await wait(130)
      set({
        rot: 6,
        aR: 128,
        rR: 1.16,
        bR: -3,
        ptR: 1,
        ex: 3.4,
        ey: -3.8,
        browOn: 1,
        brow: 0.6,
        sq: 1,
      })
      await wait(180)
      await say(wait)
    },
    async think(wait) {
      set({ aL: -62, rL: 1.05, bL: 11, ex: 2.6, ey: -3.8, browOn: 1, brow: 0.8, rot: -3 })
      mouth('flat')
      extra(
        'dots',
        true,
        [
          { opacity: 0, transform: 'scale(0.6)' },
          { opacity: 1, transform: 'scale(1)' },
        ],
        {
          duration: 320,
        },
      )
      await wait(200)
      await say(wait, { onBeat: () => set({ rot: -1, ex: 1.8 }) })
      await wait(250)
    },
    async nod(wait) {
      set({ happy: 1, blush: 0.95, sq: 0.86, aL: 40, aR: 40 })
      mouth('grin')
      await wait(110)
      set({ y: -16, sq: 1.06, aR: 150, bR: -6 })
      await wait(170)
      set({ y: 0, sq: 1 })
      await wait(520)
    },
    async cheer(wait) {
      set({ sq: 0.8, aL: -8, aR: -8, ex: 0, ey: 1 })
      mouth('o')
      await wait(150)
      set({ y: -54, sq: 1.16, tuck: 1, aL: 166, aR: 166, bL: -6, bR: -6, happy: 1, blush: 1 })
      mouth('wide')
      if (!reduced()) {
        onConfetti()
        confetti()
        starBurst()
      }
      await wait(300)
      set({ y: 0, tuck: 0, sq: 1 })
      await wait(420)
      for (let i = 0; i < 2; i++) {
        set({ aL: 148, aR: 172 })
        await wait(150)
        set({ aL: 172, aR: 148 })
        await wait(150)
      }
      set({ aL: 150, aR: 150 })
      await say(wait, { hold: 500 })
    },
    async oops(wait) {
      set({
        sq: 0.93,
        rot: -4,
        browOn: 1,
        brow: -1,
        ex: -2,
        ey: 3,
        aL: -24,
        aR: -24,
        bL: 4,
        bR: 4,
        blush: 0.3,
      })
      mouth('frown')
      extra(
        'sweat',
        true,
        [
          { opacity: 0, transform: 'translateY(-6px)' },
          { opacity: 1, transform: 'translateY(3px)' },
        ],
        { duration: 420 },
      )
      for (const x of [-6, 5, -3, 0]) {
        set({ x })
        await wait(70)
      }
      await say(wait)
    },
    // Empty states: Noto falls asleep and stays asleep.
    async sleep() {
      lidHold = true
      set({ lid: 1, rot: 5, aL: 6, aR: 6, bL: 3, bR: 3, ex: 0, ey: 2, blush: 0.4, sq: 0.97 })
      mouth('o')
      breathPeriod = 4.8
      breathAmp = 0.026
      extra(
        'zzz',
        true,
        [
          { opacity: 0, transform: 'translate(-4px, 8px) scale(0.7)' },
          { opacity: 1, transform: 'translate(0, 0) scale(1)', offset: 0.4 },
          { opacity: 0, transform: 'translate(8px, -12px) scale(1.15)' },
        ],
        { duration: 1800, iterations: 2, easing: 'ease-out' },
      )
      const text = line()
      if (text) onSay(text)
    },
  }

  const play = async (name: NotoMood) => {
    const t = ++token
    clearExtras()
    onSay(null)
    lidHold = false
    breathPeriod = 3.6
    breathAmp = 0.012
    rest()
    follow = false
    try {
      await MOVES[name](waitFor(t))
    } catch (e) {
      if (e === INTERRUPTED) return
      throw e
    }
    if (t !== token || name === 'sleep') return
    onSay(null)
    clearExtras()
    rest()
  }

  /* Landing speed kicks the squash spring. framer-motion springs can't take a velocity
     impulse, so dip the target for KICK_MS: the same push, spread over a few frames. */
  const kick = (amount: number) => {
    P.sq.set((targets.sq ?? 1) - amount / (SQ_STIFFNESS * (KICK_MS / 1000)))
    later(() => P.sq.set(targets.sq ?? 1), KICK_MS)
  }

  const render = (now: number) => {
    if (!visible) return
    const r = reduced()
    const yv = P.y.get()
    if (!r && prevY < -3 && yv >= -0.5 && P.y.getVelocity() > 120)
      kick(Math.min(4, P.y.getVelocity() * 0.006))
    prevY = yv

    const breath = r ? 0 : Math.sin((now / 1000) * ((2 * Math.PI) / breathPeriod)) * breathAmp
    let y = yv
    let sq = P.sq.get() * (1 + breath)
    // Overshoot into the floor becomes squash; Noto never sinks.
    if (y > 0) {
      sq *= 1 - Math.min(0.25, y * 0.012)
      y = 0
    }
    const sx = 1 + (1 - sq) * 0.85
    const x = P.x.get()
    el.whole.setAttribute(
      'transform',
      `translate(${fmt(x)} ${fmt(y)}) rotate(${fmt(P.rot.get())} 100 172)`,
    )
    el.torso.setAttribute(
      'transform',
      `translate(100 150) scale(${fmt(sx)} ${fmt(sq)}) translate(-100 -150)`,
    )

    // Legs: hips ride the torso, feet stay planted (or tuck when airborne).
    const tuck = P.tuck.get()
    const spread = clamp((1 - sq) * 16, -4, 10)
    const knee = 2 + Math.max(0, 1 - sq) * 28 + tuck * 6
    for (const [side, leg, shoe] of [
      [-1, el.legL, el.shoeL],
      [1, el.legR, el.shoeR],
    ] as const) {
      const hx = 100 + side * 14 * sx
      const hy = 150
      const fx = 100 + side * (18 + spread)
      const fy = 171 - tuck * 11
      leg.setAttribute(
        'd',
        `M${fmt(hx)} ${hy}Q${fmt((hx + fx) / 2 + side * knee)} ${fmt((hy + fy) / 2)} ${fmt(fx)} ${fmt(fy)}`,
      )
      shoe.setAttribute(
        'transform',
        `translate(${fmt(fx + side * 3)} ${fmt(fy + 2)}) rotate(${fmt(side * tuck * 14)})`,
      )
    }
    const lift = clamp(-yv / 80, 0, 0.55)
    el.shadow.setAttribute(
      'transform',
      `translate(${fmt(100 + x)} 178) scale(${fmt(1 - lift)}) translate(-100 -178)`,
    )
    el.shadow.setAttribute('opacity', String(fmt(0.14 * (1 - lift))))

    // The fold corner flaps perpendicular to its hinge (120,58)-(142,80).
    const k = clamp(fold.get(), 0.55, 1.45)
    const h = (k - 1) * 0.5
    const a = 1 + h
    const b = -h
    el.fold.setAttribute(
      'transform',
      `matrix(${fmt(a)} ${fmt(b)} ${fmt(b)} ${fmt(a)} ${fmt(131 - (a * 131 + b * 69))} ${fmt(69 - (b * 131 + a * 69))})`,
    )

    // Eyes
    const lid = P.lid.get()
    const ls = Math.max(0.08, 1 - lid)
    const happy = clamp(P.happy.get(), 0, 1)
    el.eyeL.setAttribute('transform', `translate(84 98) scale(1 ${fmt(ls)}) translate(-84 -98)`)
    el.eyeR.setAttribute('transform', `translate(112 98) scale(1 ${fmt(ls)}) translate(-112 -98)`)
    const pupil = `translate(${fmt(clamp(P.ex.get(), -3.6, 3.6))} ${fmt(clamp(P.ey.get(), -4.4, 4.4))})`
    el.pupL.setAttribute('transform', pupil)
    el.pupR.setAttribute('transform', pupil)
    const shut = clamp((lid - 0.8) * 5, 0, 1)
    el.eyes.setAttribute('opacity', String(fmt((1 - happy) * (1 - shut))))
    el.happy.setAttribute('opacity', String(fmt(happy)))
    el.shut.setAttribute('opacity', String(fmt(shut * (1 - happy))))

    // Brows: >0 raised, <0 worried (inner ends up).
    const bw = P.brow.get()
    const up = Math.max(0, bw) * 3
    const wo = Math.max(0, -bw)
    el.browL.setAttribute(
      'd',
      `M76 ${fmt(84 - up + wo)}Q83 ${fmt(80 - up - wo * 2)} 91 ${fmt(82 - up - wo * 4)}`,
    )
    el.browR.setAttribute(
      'd',
      `M124 ${fmt(84 - up + wo)}Q117 ${fmt(80 - up - wo * 2)} 109 ${fmt(82 - up - wo * 4)}`,
    )
    el.brows.setAttribute('opacity', String(fmt(clamp(P.browOn.get(), 0, 1))))
    el.blush.setAttribute('opacity', String(fmt(clamp(P.blush.get(), 0, 1) * 0.65)))

    // Mouth: width, curve, open.
    const w = P.mw.get()
    const c = P.mc.get()
    const o = Math.max(0, P.mo.get())
    const yc = 117 - c * 1.5
    const cu = yc + c * 5
    const cl = cu + o * 16
    const md = `M${fmt(100 - w)} ${fmt(yc)}Q100 ${fmt(cu)} ${fmt(100 + w)} ${fmt(yc)}Q100 ${fmt(cl)} ${fmt(100 - w)} ${fmt(yc)}Z`
    el.mline.setAttribute('d', md)
    el.mfill.setAttribute('d', md)
    el.mclip.setAttribute('d', md)
    el.mfill.setAttribute('fill-opacity', String(fmt(clamp(o * 12, 0, 1))))
    el.tongue.setAttribute('cy', String(fmt(yc + (c * 5 + o * 16) * 0.78)))
    el.tongue.setAttribute('rx', String(fmt(w * 0.55)))
    el.tongue.setAttribute('ry', String(fmt(o * 6)))
    el.tongue.setAttribute('opacity', String(fmt(clamp(o * 5, 0, 1))))

    // Arms trail the lean.
    const trail = (lag.get() - P.rot.get()) * 1.4
    const L = arm(-1, P.aL.get(), P.bL.get(), P.rL.get(), trail)
    const R = arm(1, P.aR.get(), P.bR.get(), P.rR.get(), trail)
    const wig = P.wig.get()
    el.armL.setAttribute('d', L.d)
    el.armR.setAttribute('d', R.d)
    el.handL.setAttribute(
      'transform',
      `translate(${fmt(L.hx)} ${fmt(L.hy)}) rotate(${fmt(L.deg - wig)}) scale(-1 1)`,
    )
    el.handR.setAttribute(
      'transform',
      `translate(${fmt(R.hx)} ${fmt(R.hy)}) rotate(${fmt(R.deg + wig)})`,
    )
    el.fingerR.setAttribute('height', String(fmt(6 + 13 * clamp(P.ptR.get(), 0, 1))))
  }

  /* Idle life: blinks every 2.4–5.8 s, small glances when the pointer is still, and eyes plus
     a slight lean that follow the pointer. */
  const blinkLoop = () =>
    later(
      () => {
        blink()
        if (Math.random() < 0.18) later(blink, 220)
        blinkLoop()
      },
      2400 + Math.random() * 3400,
    )
  const glanceLoop = () =>
    later(
      () => {
        if (follow && performance.now() - lastPointer > 2500)
          set({ ex: -2.5 + Math.random() * 5, ey: -2 + Math.random() * 4 })
        glanceLoop()
      },
      1600 + Math.random() * 2200,
    )
  blinkLoop()
  glanceLoop()

  const onPointer = (e: PointerEvent) => {
    if (!follow || !visible) return
    const box = svg.getBoundingClientRect()
    const dx = e.clientX - (box.left + box.width / 2)
    const dy = e.clientY - (box.top + box.height * 0.48)
    const d = Math.hypot(dx, dy) || 1
    const f = clamp(d / 260, 0, 1)
    set({ ex: (dx / d) * 3.4 * f, ey: (dy / d) * 4 * f, rot: clamp(dx / 500, -1, 1) * 2.5 })
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
    token++
    timers.forEach(clearTimeout)
    timers.clear()
    window.removeEventListener('pointermove', onPointer)
    observer?.disconnect()
    clearExtras()
    burst.replaceChildren()
  }

  return { play, render: (now: number) => !destroyed && render(now), destroy }
}

type Rig = ReturnType<typeof createRig>

/**
 * Noto, the animated note who hosts practice screens. Each mood plays once when it is set;
 * a new mood interrupts the current one. To replay the same mood, change the component's key.
 */
export function Noto({ mood, line, onConfetti, className }: NotoProps) {
  const clipId = `${useId()}-mouth`
  const reduced = useReducedMotion() ?? false

  // One spring per rig part.
  const x = useSpring(REST.x, SPRINGS.x)
  const y = useSpring(REST.y, SPRINGS.y)
  const rot = useSpring(REST.rot, SPRINGS.rot)
  const sq = useSpring(REST.sq, SPRINGS.sq)
  const aL = useSpring(REST.aL, SPRINGS.arm)
  const aR = useSpring(REST.aR, SPRINGS.arm)
  const bL = useSpring(REST.bL, SPRINGS.bend)
  const bR = useSpring(REST.bR, SPRINGS.bend)
  const rL = useSpring(REST.rL, SPRINGS.reach)
  const rR = useSpring(REST.rR, SPRINGS.reach)
  const ptR = useSpring(REST.ptR, SPRINGS.ptR)
  const wig = useSpring(REST.wig, SPRINGS.wig)
  const tuck = useSpring(REST.tuck, SPRINGS.tuck)
  const ex = useSpring(REST.ex, SPRINGS.eye)
  const ey = useSpring(REST.ey, SPRINGS.eye)
  const lid = useSpring(REST.lid, SPRINGS.lid)
  const happy = useSpring(REST.happy, SPRINGS.happy)
  const brow = useSpring(REST.brow, SPRINGS.brow)
  const browOn = useSpring(REST.browOn, SPRINGS.browOn)
  const mo = useSpring(REST.mo, SPRINGS.mo)
  const mc = useSpring(REST.mc, SPRINGS.mc)
  const mw = useSpring(REST.mw, SPRINGS.mw)
  const blush = useSpring(REST.blush, SPRINGS.blush)
  // Secondary motion: the arms trail the lean on a slower spring, and the fold corner
  // flaps from vertical speed only.
  const lag = useSpring(rot, SPRINGS.lag)
  const yVelocity = useVelocity(y)
  const foldTarget = useTransform(yVelocity, (v) => 1 + clamp(-v * 0.0022, -0.35, 0.45))
  const fold = useSpring(foldTarget, SPRINGS.fold)

  const svgRef = useRef<SVGSVGElement>(null)
  const burstRef = useRef<HTMLDivElement>(null)
  const rigRef = useRef<Rig | null>(null)
  const latest = useRef({ reduced, line, onConfetti })
  const [shown, setShown] = useState<string | null>(null)

  useEffect(() => {
    latest.current = { reduced, line, onConfetti }
  })

  useEffect(() => {
    const P: Springs = {
      x,
      y,
      rot,
      sq,
      aL,
      aR,
      bL,
      bR,
      rL,
      rR,
      ptR,
      wig,
      tuck,
      ex,
      ey,
      lid,
      happy,
      brow,
      browOn,
      mo,
      mc,
      mw,
      blush,
    }
    const rig = createRig({
      svg: svgRef.current!,
      burst: burstRef.current!,
      P,
      lag,
      fold,
      reduced: () => latest.current.reduced,
      line: () => latest.current.line,
      onConfetti: () => latest.current.onConfetti?.(),
      onSay: setShown,
    })
    rigRef.current = rig
    return () => {
      rig.destroy()
      rigRef.current = null
    }
    // The springs are stable MotionValues; the rig is built once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void rigRef.current?.play(mood)
  }, [mood])

  useAnimationFrame((now) => rigRef.current?.render(now))

  return (
    <div className={cn('relative', className)}>
      <svg
        ref={svgRef}
        viewBox="0 0 200 200"
        role="img"
        aria-label="Noto, the Unishare note mascot"
        className="block h-auto w-full overflow-visible"
      >
        <defs>
          <clipPath id={clipId}>
            <path data-part="mclip" d="M92 115.5Q100 120.5 108 115.5Q100 120.5 92 115.5Z" />
          </clipPath>
        </defs>
        <ellipse
          data-part="shadow"
          cx="100"
          cy="178"
          rx="36"
          ry="5.5"
          style={SHADOW_STYLE}
          opacity="0.14"
        />
        <g data-part="whole">
          <g fill="none" strokeWidth="4.6" strokeLinecap="round" style={LIMB_STYLE}>
            <path data-part="legL" d="M85.99 150Q81.98 160.5 81.99 171" />
            <path data-part="legR" d="M114.01 150Q118.02 160.5 118.01 171" />
          </g>
          <g data-part="shoeL" transform="translate(78.99 173)">
            <ellipse rx="9.5" ry="4.8" style={INK_STYLE} />
            <ellipse cx="-3" cy="-1.8" rx="3.2" ry="1.2" fill="#fff" opacity="0.35" />
          </g>
          <g data-part="shoeR" transform="translate(121.01 173)">
            <ellipse rx="9.5" ry="4.8" style={INK_STYLE} />
            <ellipse cx="3" cy="-1.8" rx="3.2" ry="1.2" fill="#fff" opacity="0.35" />
          </g>
          <g data-part="torso">
            <path
              d="M68 58h52l22 22v58a12 12 0 0 1-12 12H68a12 12 0 0 1-12-12V70a12 12 0 0 1 12-12z"
              fill={ORANGE}
              stroke={NAVY}
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M64.5 76v24"
              stroke="#fff"
              strokeOpacity="0.4"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M64.5 106v3"
              stroke="#fff"
              strokeOpacity="0.4"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <g stroke={NAVY} strokeOpacity="0.16" strokeWidth="3.5" strokeLinecap="round">
              <path d="M70 133h46" />
              <path d="M70 141h28" />
            </g>
            <path
              data-part="fold"
              d="M120 58v14a8 8 0 0 0 8 8h14"
              fill={FOLD}
              stroke={NAVY}
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <g
              data-part="brows"
              fill="none"
              stroke={NAVY}
              strokeWidth="3.4"
              strokeLinecap="round"
              opacity="0"
            >
              <path data-part="browL" d="M76 84Q83 80 91 82" />
              <path data-part="browR" d="M124 84Q117 80 109 82" />
            </g>
            <g data-part="eyes">
              <g data-part="eyeL">
                <ellipse cx="84" cy="98" rx="9" ry="11" fill="#fff" stroke={NAVY} strokeWidth="3" />
                <g data-part="pupL" transform="translate(1.2 1.4)">
                  <circle cx="84" cy="98" r="4.7" fill={NAVY} />
                  <circle cx="82.4" cy="96.2" r="1.6" fill="#fff" />
                </g>
              </g>
              <g data-part="eyeR">
                <ellipse
                  cx="112"
                  cy="98"
                  rx="9"
                  ry="11"
                  fill="#fff"
                  stroke={NAVY}
                  strokeWidth="3"
                />
                <g data-part="pupR" transform="translate(1.2 1.4)">
                  <circle cx="112" cy="98" r="4.7" fill={NAVY} />
                  <circle cx="110.4" cy="96.2" r="1.6" fill="#fff" />
                </g>
              </g>
            </g>
            <g
              data-part="happy"
              fill="none"
              stroke={NAVY}
              strokeWidth="3.6"
              strokeLinecap="round"
              opacity="0"
            >
              <path d="M76 101q8-9 16 0" />
              <path d="M104 101q8-9 16 0" />
            </g>
            <g
              data-part="shut"
              fill="none"
              stroke={NAVY}
              strokeWidth="3.4"
              strokeLinecap="round"
              opacity="0"
            >
              <path d="M76 98q8 5 16 0" />
              <path d="M104 98q8 5 16 0" />
            </g>
            <g data-part="blush" fill={BLUSH} opacity="0.39">
              <ellipse cx="72" cy="115" rx="5.5" ry="4" />
              <ellipse cx="124" cy="115" rx="5.5" ry="4" />
            </g>
            <path
              data-part="mfill"
              fill={NAVY}
              fillOpacity="0"
              d="M92 115.5Q100 120.5 108 115.5Q100 120.5 92 115.5Z"
            />
            <ellipse
              data-part="tongue"
              fill={PINK}
              clipPath={`url(#${clipId})`}
              cx="100"
              cy="119.4"
              rx="4.4"
              ry="0"
              opacity="0"
            />
            <path
              data-part="mline"
              fill="none"
              stroke={NAVY}
              strokeWidth="3.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M92 115.5Q100 120.5 108 115.5Q100 120.5 92 115.5Z"
            />
            <g fill="none" strokeWidth="4.6" strokeLinecap="round" style={LIMB_STYLE}>
              <path data-part="armL" d="M58 108Q47.82 121.73 49.18 138.76" />
              <path data-part="armR" d="M142 108Q152.18 121.73 150.82 138.76" />
            </g>
            <g data-part="handL" transform="translate(49.18 138.76) rotate(16) scale(-1 1)">
              <rect
                data-part="fingerL"
                x="-2.7"
                y="0"
                width="5.4"
                height="6"
                rx="2.7"
                fill={CREAM}
                stroke={NAVY}
                strokeWidth="2.8"
              />
              <circle cx="6.4" cy="-2.4" r="3.3" fill={CREAM} stroke={NAVY} strokeWidth="2.6" />
              <ellipse rx="7.6" ry="8.2" fill={CREAM} stroke={NAVY} strokeWidth="3.1" />
            </g>
            <g data-part="handR" transform="translate(150.82 138.76) rotate(-16)">
              <rect
                data-part="fingerR"
                x="-2.7"
                y="0"
                width="5.4"
                height="6"
                rx="2.7"
                fill={CREAM}
                stroke={NAVY}
                strokeWidth="2.8"
              />
              <circle cx="6.4" cy="-2.4" r="3.3" fill={CREAM} stroke={NAVY} strokeWidth="2.6" />
              <ellipse rx="7.6" ry="8.2" fill={CREAM} stroke={NAVY} strokeWidth="3.1" />
            </g>
            <path
              data-part="sweat"
              d="M148 74q6 9 0 13q-6-4 0-13z"
              fill="#7fb2ff"
              stroke={NAVY}
              strokeWidth="2"
              opacity="0"
              style={POP_STYLE}
            />
            <g data-part="dots" opacity="0" style={INK_POP_STYLE}>
              <circle cx="150" cy="64" r="3" />
              <circle cx="160" cy="55" r="4" />
              <circle cx="173" cy="44" r="5.5" />
            </g>
            <g
              data-part="zzz"
              fontFamily="var(--font-display, 'Baloo 2'), ui-rounded, sans-serif"
              fontWeight="800"
              opacity="0"
              style={INK_POP_STYLE}
            >
              <text x="140" y="60" fontSize="14">
                z
              </text>
              <text x="152" y="46" fontSize="18">
                z
              </text>
              <text x="166" y="30" fontSize="22">
                z
              </text>
            </g>
            <g fill="#ffc94d" stroke={NAVY} strokeWidth="2" strokeLinejoin="round">
              <path
                data-part="star"
                d="M44 70l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"
                opacity="0"
                style={POP_STYLE}
              />
              <path
                data-part="star"
                d="M156 50l2.4 5.6 5.6 2.4-5.6 2.4-2.4 5.6-2.4-5.6-5.6-2.4 5.6-2.4z"
                opacity="0"
                style={POP_STYLE}
              />
              <path
                data-part="star"
                d="M162 104l2 4.6 4.6 2-4.6 2-2 4.6-2-4.6-4.6-2 4.6-2z"
                opacity="0"
                style={POP_STYLE}
              />
            </g>
          </g>
        </g>
      </svg>
      <div
        ref={burstRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-[40%] left-1/2 size-0 [&>i]:absolute [&>i]:top-0 [&>i]:left-0 [&>i]:h-3 [&>i]:w-[7px] [&>i]:rounded-[2px]"
      />
      {line && shown !== null && (
        <p
          role="status"
          className="bg-card text-card-foreground absolute top-full left-1/2 mt-1 w-max max-w-56 -translate-x-1/2 rounded-2xl border px-3 py-1.5 text-center text-sm"
        >
          <span className="sr-only">{line}</span>
          <span aria-hidden="true">{shown}</span>
        </p>
      )}
    </div>
  )
}
