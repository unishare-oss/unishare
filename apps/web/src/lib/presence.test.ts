import { describe, it, expect } from 'vitest'
import { PRESENCE_COLORS, hashToColorIndex } from './presence'

describe('PRESENCE_COLORS', () => {
  it('has exactly 10 entries', () => {
    expect(PRESENCE_COLORS).toHaveLength(10)
  })

  it('contains only valid hex color strings', () => {
    for (const color of PRESENCE_COLORS) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})

describe('hashToColorIndex', () => {
  it('returns the same index for the same ID (deterministic)', () => {
    const a = hashToColorIndex('user-abc', 10)
    const b = hashToColorIndex('user-abc', 10)
    expect(a).toBe(b)
  })

  it('returns a number >= 0 and < paletteSize', () => {
    const inputs = ['user-1', 'user-2', 'anon-session-xyz', 'a', 'very-long-id-string-here']
    for (const id of inputs) {
      const idx = hashToColorIndex(id, 10)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(10)
    }
  })

  it('produces at least 5 distinct values for 20 different inputs', () => {
    const results = new Set<number>()
    for (let i = 0; i < 20; i++) {
      results.add(hashToColorIndex(`user-${i}`, 10))
    }
    expect(results.size).toBeGreaterThanOrEqual(5)
  })

  it('handles empty string without throwing', () => {
    expect(() => hashToColorIndex('', 10)).not.toThrow()
    const idx = hashToColorIndex('', 10)
    expect(idx).toBeGreaterThanOrEqual(0)
    expect(idx).toBeLessThan(10)
  })
})
