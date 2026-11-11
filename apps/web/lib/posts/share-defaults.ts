import type { PostType } from '@/lib/posts/form-types'

export interface GuessedFields {
  type?: PostType
  courseId?: string
  moduleNumber?: number
  examYear?: number
  title?: string
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const CAMERA_NAME = /^(img|dsc|pxl|scan|screenshot)/i
const EXAM_WORDS = /\b(?:midterm|final|exam|test)s?\d*\b/i
const EXERCISE_WORDS = /\b(?:exercise|worksheet|pset|problem set|tutorial|lab|practice)s?\d*\b/i
const MODULE = /\b(?:module|mod|m)\s?([1-3])\b/i
const EXAM_YEAR = /\b(199\d|20[0-2]\d)\b/

/** Guesses what it can from a file name; only the fields it is sure of are returned. */
export function guessFromFileName(
  fileName: string,
  courses: { id: string; code: string }[],
): GuessedFields {
  const text = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const guess: GuessedFields = {}
  let title = text

  for (const course of courses) {
    const code = course.code.replace(/[\s-]/g, '')
    const prefix = code.match(/^[A-Za-z]+/)?.[0]
    if (!prefix || prefix === code) continue
    const match = new RegExp(
      `\\b${escapeRegExp(prefix)}\\s?${escapeRegExp(code.slice(prefix.length))}\\b`,
      'i',
    ).exec(text)
    if (match) {
      guess.courseId = course.id
      title = title.replace(match[0], ' ')
      break
    }
  }

  const moduleMatch = MODULE.exec(text)
  if (moduleMatch) guess.moduleNumber = Number(moduleMatch[1])

  if (EXAM_WORDS.test(text)) guess.type = 'OLD_QUESTION'
  else if (EXERCISE_WORDS.test(text)) guess.type = 'EXERCISE'

  const examYear = EXAM_YEAR.exec(text)
  if (examYear) guess.examYear = Number(examYear[1])

  if (!CAMERA_NAME.test(text)) {
    const tidy = title
      .replace(/([A-Za-z])(\d)/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
    if (tidy) guess.title = tidy.charAt(0).toUpperCase() + tidy.slice(1)
  }

  return guess
}

/** Semester 1–3 from the month, counted from the month the academic year starts (fallback 9). */
export function deriveSemester(now: Date, academicStartMonth = 9): 1 | 2 | 3 {
  const offset = (now.getMonth() + 1 - academicStartMonth + 12) % 12
  if (offset <= 4) return 1
  if (offset <= 9) return 2
  return 3
}

/** The highest module among a course's notes, or undefined when it has none. */
export function newestModuleWithNotes(
  posts: { moduleNumber?: number | null }[],
): number | undefined {
  const modules = posts
    .map((post) => post.moduleNumber)
    .filter((n): n is number => !!n && n >= 1 && n <= 3)
  return modules.length > 0 ? Math.max(...modules) : undefined
}

/** The labels still needed before Share is enabled, in the order the form asks for them. */
export function missingFields(
  values: {
    postType: PostType | null
    selectedCourse: string
    moduleNum: string
    title: string
    examYear: string
    homeworkConfirmed?: boolean
  },
  readyFileCount: number,
): string[] {
  const missing: string[] = []
  if (readyFileCount === 0) missing.push('file')
  if (!values.postType) missing.push('type')
  if (!values.selectedCourse) missing.push('course')
  if (!values.moduleNum) missing.push('a module')
  if (values.title.trim().length < 3) missing.push('title')
  if (values.postType === 'OLD_QUESTION' && !values.examYear) missing.push('exam year')
  if (values.postType === 'EXERCISE' && !values.homeworkConfirmed) missing.push('homework check')
  return missing
}
