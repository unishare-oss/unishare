import { describe, expect, it } from 'vitest'
import { deriveSemester, guessFromFileName } from './share-defaults'

const courses = [
  { id: 'c1', code: 'CSC213' },
  { id: 'c2', code: 'MTH101' },
]

describe('guessFromFileName', () => {
  it('guesses fields from a file name', () => {
    const heaps = guessFromFileName('CSC213_Module10_Heaps.pdf', courses)
    expect(heaps.courseId).toBe('c1')
    expect(heaps.moduleNumber).toBe(10)
    expect(heaps.title).toBe('Module 10 Heaps')
    expect(guessFromFileName('CSC213_Module9_HashTables.pdf', courses).title).toBe(
      'Module 9 Hash Tables',
    )

    const exam = guessFromFileName('MTH101 Midterm 2024.pdf', courses)
    expect(exam.type).toBe('OLD_QUESTION')
    expect(exam.examYear).toBe(2024)
    expect(exam.courseId).toBe('c2')

    expect(guessFromFileName('Module 20.pdf', courses).moduleNumber).toBe(20)
    expect(guessFromFileName('Module 21.pdf', courses).moduleNumber).toBeUndefined()
    expect(guessFromFileName('Week 0.pdf', courses).moduleNumber).toBeUndefined()
    expect(guessFromFileName('IMG_2041.jpg', courses).title).toBeUndefined()
    expect(guessFromFileName('scan 3.pdf', courses).title).toBeUndefined()
    expect(guessFromFileName('DSC0012.jpg', courses).title).toBeUndefined()
  })

  it('guesses exercises and ignores courses outside the list', () => {
    expect(guessFromFileName('Homework 3.pdf', courses).type).toBe('EXERCISE')
    expect(guessFromFileName('BIO999 notes.pdf', courses).courseId).toBeUndefined()
  })
})

describe('deriveSemester', () => {
  it('maps the month to a semester', () => {
    expect(deriveSemester(new Date(2026, 8, 10))).toBe(1)
    expect(deriveSemester(new Date(2026, 1, 10))).toBe(2)
    expect(deriveSemester(new Date(2026, 6, 10))).toBe(3)
    expect(deriveSemester(new Date(2026, 7, 20))).toBe(3)
  })
})
