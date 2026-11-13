'use client'

import {
  useAnimationFrame,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion'
import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { NotoArt } from './noto-art'
import { REST, SPRINGS, type NotoMood, type PoseSprings } from './noto-pose'
import { clamp, createRig } from './noto-rig'

export type { NotoMood }

type NotoProps = {
  mood: NotoMood
  /** One short line, shown in a bubble while Noto says it. */
  line?: string
  /** Called when Noto cheers, alongside its own confetti burst. */
  onConfetti?: () => void
  className?: string
}

type NotoRig = ReturnType<typeof createRig>

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
  const squash = useSpring(REST.squash, SPRINGS.squash)
  const armAngleL = useSpring(REST.armAngleL, SPRINGS.arm)
  const armAngleR = useSpring(REST.armAngleR, SPRINGS.arm)
  const armBendL = useSpring(REST.armBendL, SPRINGS.bend)
  const armBendR = useSpring(REST.armBendR, SPRINGS.bend)
  const armReachL = useSpring(REST.armReachL, SPRINGS.reach)
  const armReachR = useSpring(REST.armReachR, SPRINGS.reach)
  const pointFinger = useSpring(REST.pointFinger, SPRINGS.pointFinger)
  const wiggle = useSpring(REST.wiggle, SPRINGS.wiggle)
  const tuck = useSpring(REST.tuck, SPRINGS.tuck)
  const pupilX = useSpring(REST.pupilX, SPRINGS.eye)
  const pupilY = useSpring(REST.pupilY, SPRINGS.eye)
  const lid = useSpring(REST.lid, SPRINGS.lid)
  const happy = useSpring(REST.happy, SPRINGS.happy)
  const brow = useSpring(REST.brow, SPRINGS.brow)
  const browOn = useSpring(REST.browOn, SPRINGS.browOn)
  const mouthOpen = useSpring(REST.mouthOpen, SPRINGS.mouthOpen)
  const mouthCurve = useSpring(REST.mouthCurve, SPRINGS.mouthCurve)
  const mouthWidth = useSpring(REST.mouthWidth, SPRINGS.mouthWidth)
  const blush = useSpring(REST.blush, SPRINGS.blush)
  // Secondary motion: the arms trail the lean on a slower spring, and the fold corner
  // flaps from vertical speed only.
  const lag = useSpring(rot, SPRINGS.lag)
  const yVelocity = useVelocity(y)
  const foldTarget = useTransform(yVelocity, (v) => 1 + clamp(-v * 0.0022, -0.35, 0.45))
  const fold = useSpring(foldTarget, SPRINGS.fold)

  const svgRef = useRef<SVGSVGElement>(null)
  const burstRef = useRef<HTMLDivElement>(null)
  const rigRef = useRef<NotoRig | null>(null)
  const latest = useRef({ reduced, line, onConfetti })
  const [shown, setShown] = useState<string | null>(null)

  // Keeps the rig's callbacks current; must stay declared before the rig and mood effects.
  useEffect(() => {
    latest.current = { reduced, line, onConfetti }
  })

  useEffect(() => {
    const springs: PoseSprings = {
      x,
      y,
      rot,
      squash,
      armAngleL,
      armAngleR,
      armBendL,
      armBendR,
      armReachL,
      armReachR,
      pointFinger,
      wiggle,
      tuck,
      pupilX,
      pupilY,
      lid,
      happy,
      brow,
      browOn,
      mouthOpen,
      mouthCurve,
      mouthWidth,
      blush,
    }
    const rig = createRig({
      svg: svgRef.current!,
      burst: burstRef.current!,
      springs,
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
        <NotoArt clipId={clipId} />
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
