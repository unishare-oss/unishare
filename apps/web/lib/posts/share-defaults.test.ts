import { describe, expect, it } from 'vitest'
import {
  deriveSemester,
  guessFromFileName,
  missingFields,
  newestModuleWithNotes,
} from './share-defaults'

const courses = [
  { id: 'c1', code: 'CSC213' },
  { id: 'c2', code: 'MTH101' },
]

describe('guessFromFileName', () => {
  it('reads course, module and title from a tidy name', () => {
    expect(guessFromFileName('CSC213_Module2_Heaps.pdf', courses)).toEqual({
      courseId: 'c1',
      moduleNumber: 2,
      title: 'Module 2 Heaps',
    })
  })

  it('does not treat a week as a module', () => {
    expect(guessFromFileName('CSC213_Week10.pdf', courses)).toEqual({
      courseId: 'c1',
      title: 'Week 10',
    })
  })

  it('guesses a module from mod or M prefixes', () => {
    expect(guessFromFileName('CSC213 mod 3.pdf', courses).moduleNumber).toBe(3)
    expect(guessFromFileName('CSC213_M1.pdf', courses).moduleNumber).toBe(1)
  })

  it('reads an exam with a spaced course code and a year', () => {
    expect(guessFromFileName('csc 213 midterm 2023.pdf', courses)).toMatchObject({
      courseId: 'c1',
      type: 'OLD_QUESTION',
      examYear: 2023,
    })
  })

  it('leaves everything out for a camera name', () => {
    expect(guessFromFileName('IMG_2041.jpg', courses)).toEqual({})
  })

  it('reads an exercise from pset3', () => {
    expect(guessFromFileName('pset3.pdf', courses)).toMatchObject({ type: 'EXERCISE' })
  })

  it('ignores a course code the student cannot post to', () => {
    expect(guessFromFileName('PHY200_week2.pdf', courses).courseId).toBeUndefined()
  })

  it('matches words, not parts of words', () => {
    expect(guessFromFileName('latest_notes.pdf', courses).type).toBeUndefined()
  })

  it('accepts hyphenated codes and ignores modules above 3', () => {
    const guess = guessFromFileName('csc-213 module 4.pdf', courses)
    expect(guess.courseId).toBe('c1')
    expect(guess.moduleNumber).toBeUndefined()
  })
})

describe('deriveSemester', () => {
  const at = (month: number) => new Date(2026, month - 1, 15)

  it('counts from the fallback start month 9', () => {
    expect([9, 1, 2, 6, 7, 8].map((m) => deriveSemester(at(m)))).toEqual([1, 1, 2, 2, 3, 3])
  })

  it('offset 5 and 10 and 11 with start month 1', () => {
    expect(deriveSemester(at(1), 1)).toBe(1)
    expect(deriveSemester(at(5), 1)).toBe(1)
    expect(deriveSemester(at(6), 1)).toBe(2)
    expect(deriveSemester(at(10), 1)).toBe(2)
    expect(deriveSemester(at(11), 1)).toBe(3)
    expect(deriveSemester(at(12), 1)).toBe(3)
  })
})

describe('newestModuleWithNotes', () => {
  it('returns the highest module, or undefined for none', () => {
    expect(newestModuleWithNotes([{ moduleNumber: 1 }, { moduleNumber: 3 }, {}])).toBe(3)
    expect(newestModuleWithNotes([])).toBeUndefined()
  })

  it('ignores modules outside 1 to 3 from older notes', () => {
    expect(newestModuleWithNotes([{ moduleNumber: 9 }, { moduleNumber: 2 }])).toBe(2)
  })
})

describe('missingFields', () => {
  const base = {
    postType: 'NOTE' as const,
    selectedCourse: 'c1',
    moduleNum: '4',
    title: 'Heaps',
    examYear: '',
  }

  it('reports an empty type', () => {
    expect(missingFields({ ...base, postType: null }, 1)).toEqual(['type'])
  })

  it('is empty for a complete note', () => {
    expect(missingFields(base, 1)).toEqual([])
  })

  it('lists what is missing in order', () => {
    expect(missingFields({ ...base, selectedCourse: '', moduleNum: '', title: 'a' }, 0)).toEqual([
      'file',
      'course',
      'a module',
      'title',
    ])
  })

  it('needs an exam year for old exams and the homework check for exercises', () => {
    expect(missingFields({ ...base, postType: 'OLD_QUESTION' }, 1)).toEqual(['exam year'])
    expect(missingFields({ ...base, postType: 'EXERCISE' }, 1)).toEqual(['homework check'])
    expect(missingFields({ ...base, postType: 'EXERCISE', homeworkConfirmed: true }, 1)).toEqual([])
  })
})
