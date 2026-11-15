import type { MOUTH, NotoMood, Pose } from './noto-pose'

/** A prop that appears beside Noto: a sweat drop, thought dots or sleeping zzz. */
export type Prop = 'sweat' | 'dots' | 'zzz'

/** A move's timer: resolves after ms, or throws when a newer move has taken over. */
export type Wait = (ms: number) => Promise<void>

/** What a move can do to Noto. The rig implements it. */
export type MoveRig = {
  whole: SVGElement
  set: (pose: Pose) => void
  snap: (pose: Pose) => void
  mouth: (name: keyof typeof MOUTH, overrides?: Pose) => void
  /** Back to the resting pose; pass `follow: false` to keep the eyes off the pointer. */
  rest: (options?: { follow?: boolean }) => void
  holdLids: (on: boolean) => void
  setBreathing: (period: number, amplitude: number) => void
  showProp: (
    name: Prop,
    on: boolean,
    frames?: Keyframe[],
    options?: KeyframeAnimationOptions,
  ) => void
  /** Confetti, stars and the onConfetti callback; does nothing with reduced motion. */
  celebrate: () => void
  reduced: () => boolean
  line: () => string | undefined
  onSay: (shown: string | null) => void
}

/* Show the line in the bubble and open the mouth per letter; no line, no lip-sync. */
async function say(
  rig: MoveRig,
  wait: Wait,
  options: { hold?: number; lips?: boolean; onBeat?: (n: number) => void } = {},
) {
  const text = rig.line()
  if (!text) return wait(options.hold ?? 900)
  if (rig.reduced() || options.lips === false) {
    rig.onSay(text)
    return wait(1000 + text.length * 28)
  }
  rig.onSay('')
  let shown = ''
  let beats = 0
  for (const char of text) {
    shown += char
    rig.onSay(shown)
    if (/[aeiouy]/i.test(char))
      rig.set({
        mouthOpen: 0.38 + Math.random() * 0.3,
        mouthWidth: 7 + Math.random() * 2,
        mouthCurve: 0.6,
      })
    else if (/[a-z0-9]/i.test(char)) rig.set({ mouthOpen: 0.12, mouthWidth: 6.5, mouthCurve: 0.6 })
    else rig.set({ mouthOpen: 0.02, mouthWidth: 7.5, mouthCurve: 0.9 })
    const pause = /[.,!?…]/.test(char)
    if (pause) options.onBeat?.(++beats)
    await wait(pause ? 170 : 40)
  }
  rig.mouth('smile')
  await wait(650)
}

export const MOVES: Record<NotoMood, (rig: MoveRig, wait: Wait) => Promise<void>> = {
  async popIn(rig, wait) {
    if (!rig.reduced()) {
      rig.snap({ y: 140, squash: 1.22, armAngleL: 50, armAngleR: 50, tuck: 0.6 })
      rig.whole.animate?.([{ opacity: 0 }, { opacity: 1 }], {
        duration: 140,
        easing: 'ease-out',
      })
      rig.set({ y: -20, squash: 1.12, armAngleL: 64, armAngleR: 64 })
      rig.mouth('o')
      await wait(230)
      rig.set({ y: 0, squash: 1, tuck: 0, armAngleL: 30, armAngleR: 30 })
      await wait(260)
    }
    rig.mouth('grin', { blush: 0.9 })
    await wait(380)
    rig.mouth('smile')
    // Pop in, then wave.
    rig.rest({ follow: false })
    await wait(240)
    await MOVES.wave(rig, wait)
  },
  async wave(rig, wait) {
    rig.set({
      rot: -4,
      armAngleR: 158,
      armBendR: -10,
      blush: 0.9,
      pupilX: 2,
      pupilY: -0.6,
    })
    rig.mouth('grin')
    await wait(240)
    for (let i = 0; i < 3; i++) {
      rig.set({ wiggle: 24, armAngleR: 166 })
      await wait(165)
      rig.set({ wiggle: -20, armAngleR: 146 })
      await wait(165)
    }
    rig.set({ wiggle: 0 })
    await wait(120)
  },
  async point(rig, wait) {
    rig.set({ rot: -3, armAngleR: 6, squash: 1.03, pupilX: 0, pupilY: 0 })
    await wait(130)
    rig.set({
      rot: 6,
      armAngleR: 128,
      armReachR: 1.16,
      armBendR: -3,
      pointFinger: 1,
      pupilX: 3.4,
      pupilY: -3.8,
      browOn: 1,
      brow: 0.6,
      squash: 1,
    })
    await wait(180)
    await say(rig, wait)
  },
  async think(rig, wait) {
    rig.set({
      armAngleL: -62,
      armReachL: 1.05,
      armBendL: 11,
      pupilX: 2.6,
      pupilY: -3.8,
      browOn: 1,
      brow: 0.8,
      rot: -3,
    })
    rig.mouth('flat')
    rig.showProp(
      'dots',
      true,
      [
        { opacity: 0, transform: 'scale(0.6)' },
        { opacity: 1, transform: 'scale(1)' },
      ],
      { duration: 320 },
    )
    await wait(200)
    await say(rig, wait, { onBeat: () => rig.set({ rot: -1, pupilX: 1.8 }) })
    await wait(250)
  },
  async nod(rig, wait) {
    rig.set({ happy: 1, blush: 0.95, squash: 0.86, armAngleL: 40, armAngleR: 40 })
    rig.mouth('grin')
    await wait(110)
    rig.set({ y: -16, squash: 1.06, armAngleR: 150, armBendR: -6 })
    await wait(170)
    rig.set({ y: 0, squash: 1 })
    await wait(520)
  },
  async cheer(rig, wait) {
    rig.set({ squash: 0.8, armAngleL: -8, armAngleR: -8, pupilX: 0, pupilY: 1 })
    rig.mouth('o')
    await wait(150)
    rig.set({
      y: -54,
      squash: 1.16,
      tuck: 1,
      armAngleL: 166,
      armAngleR: 166,
      armBendL: -6,
      armBendR: -6,
      happy: 1,
      blush: 1,
    })
    rig.mouth('wide')
    rig.celebrate()
    await wait(300)
    rig.set({ y: 0, tuck: 0, squash: 1 })
    await wait(420)
    for (let i = 0; i < 2; i++) {
      rig.set({ armAngleL: 148, armAngleR: 172 })
      await wait(150)
      rig.set({ armAngleL: 172, armAngleR: 148 })
      await wait(150)
    }
    rig.set({ armAngleL: 150, armAngleR: 150 })
    await say(rig, wait, { hold: 500 })
  },
  async oops(rig, wait) {
    rig.set({
      squash: 0.93,
      rot: -4,
      browOn: 1,
      brow: -1,
      pupilX: -2,
      pupilY: 3,
      armAngleL: -24,
      armAngleR: -24,
      armBendL: 4,
      armBendR: 4,
      blush: 0.3,
    })
    rig.mouth('frown')
    rig.showProp(
      'sweat',
      true,
      [
        { opacity: 0, transform: 'translateY(-6px)' },
        { opacity: 1, transform: 'translateY(3px)' },
      ],
      { duration: 420 },
    )
    for (const x of [-6, 5, -3, 0]) {
      rig.set({ x })
      await wait(70)
    }
    await say(rig, wait)
  },
  // Empty states: Noto falls asleep and stays asleep.
  async sleep(rig) {
    rig.holdLids(true)
    rig.set({
      lid: 1,
      rot: 5,
      armAngleL: 6,
      armAngleR: 6,
      armBendL: 3,
      armBendR: 3,
      pupilX: 0,
      pupilY: 2,
      blush: 0.4,
      squash: 0.97,
    })
    rig.mouth('o')
    rig.setBreathing(4.8, 0.026)
    rig.showProp(
      'zzz',
      true,
      [
        { opacity: 0, transform: 'translate(-4px, 8px) scale(0.7)' },
        { opacity: 1, transform: 'translate(0, 0) scale(1)', offset: 0.4 },
        { opacity: 0, transform: 'translate(8px, -12px) scale(1.15)' },
      ],
      { duration: 1800, iterations: 2, easing: 'ease-out' },
    )
    const text = rig.line()
    if (text) rig.onSay(text)
  },
}
