/**
 * Subtle two-tone message blip synthesized with the Web Audio API —
 * no audio asset to load. Safe to call anywhere: silently no-ops if the
 * browser blocks audio (autoplay policy) or lacks AudioContext.
 */

let ctx: AudioContext | null = null

export function playMessageSound() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()

    const t = ctx.currentTime
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.12, t + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, t) // A5
    osc.frequency.setValueAtTime(1174.66, t + 0.09) // D6
    osc.connect(gain)
    osc.start(t)
    osc.stop(t + 0.4)
  } catch {
    // No AudioContext or autoplay restriction — stay silent.
  }
}
