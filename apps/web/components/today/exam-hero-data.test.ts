import { describe, expect, it } from 'vitest'
import type { ExamEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { getExamHero } from './exam-hero-data'

const now = new Date(2026, 10, 10, 10, 0)

function exam(id: string, offsetDays: number, hour = 12): ExamEntity {
  const startsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays, hour)
  return {
    id,
    title: `Exam ${id}`,
    startsAt: startsAt.toISOString(),
    course: { id: `c-${id}` },
  } as ExamEntity
}

describe('getExamHero', () => {
  it('picks the nearest exam, two Then chips, +N and a 7-day strip', () => {
    const hero = getExamHero(
      [exam('far', 13), exam('past', -2), exam('b', 7), exam('a', 6), exam('c', 10)],
      now,
    )
    expect(hero?.next.id).toBe('a')
    expect(hero?.daysLeft).toBe(6)
    expect(hero?.then.map((e) => e.id)).toEqual(['b', 'c'])
    expect(hero?.moreCount).toBe(1)
    expect(hero?.days).toHaveLength(7)
    expect(hero?.days[0].isToday).toBe(true)
    expect(hero?.days[1].isToday).toBe(false)
    expect(hero?.days.map((d) => d.exam?.id ?? null)).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      'a',
    ])
  })

  it('counts calendar days, not 24-hour periods', () => {
    const lateNow = new Date(2026, 10, 10, 23, 0)
    const hero = getExamHero([exam('t', 1, 8)], lateNow)
    expect(hero?.daysLeft).toBe(1)
    expect(getExamHero([exam('t', 0, 23)], new Date(2026, 10, 10, 8, 0))?.daysLeft).toBe(0)
  })

  it('returns null when every exam has started', () => {
    expect(getExamHero([], now)).toBeNull()
    expect(getExamHero([exam('past', 0, 9)], now)).toBeNull()
  })

  it('flags exams on consecutive days', () => {
    const pair = getExamHero([exam('a', 6), exam('b', 7)], now)
    expect(pair?.backToBack?.map((e) => e.id)).toEqual(['a', 'b'])
    expect(getExamHero([exam('a', 6), exam('b', 9)], now)?.backToBack).toBeNull()
    expect(getExamHero([exam('a', 6)], now)?.backToBack).toBeNull()
  })
})
