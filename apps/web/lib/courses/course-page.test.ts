import { describe, expect, it } from 'vitest'
import { moduleTopicName, plural, topicLabel } from './course-page'

describe('moduleTopicName', () => {
  it.each([
    ['Module 2: Hash tables', 'Hash tables'],
    ['Week 9: Graph traversal', 'Graph traversal'],
    ['Module 3 - Sorting', 'Sorting'],
    ['Module 1 — Intro', 'Module 1 — Intro'],
    ['Lecture notes', 'Lecture notes'],
  ])('turns %j into %j', (title, expected) => {
    expect(moduleTopicName(title)).toBe(expected)
  })

  it('keeps the original title when only the prefix is left', () => {
    expect(moduleTopicName('Module 2:')).toBe('Module 2:')
  })

  it('falls back when the title is missing', () => {
    expect(moduleTopicName(null)).toBe('Untitled note')
    expect(moduleTopicName('   ')).toBe('Untitled note')
  })
})

describe('topicLabel', () => {
  it('names a module like its Topics row', () => {
    expect(
      topicLabel({
        moduleNumber: 2,
        total: 4,
        newest: { title: 'Module 2: Hash tables' } as never,
      }),
    ).toBe('Module 2 · Hash tables · 4 notes')
  })

  it('uses the singular for one note', () => {
    expect(topicLabel({ moduleNumber: 1, total: 1, newest: undefined })).toBe(
      'Module 1 · Untitled note · 1 note',
    )
  })
})

describe('plural', () => {
  it('pluralises by count', () => {
    expect(plural(0, 'note')).toBe('0 notes')
    expect(plural(1, 'old exam')).toBe('1 old exam')
    expect(plural(3, 'old exam')).toBe('3 old exams')
  })
})
