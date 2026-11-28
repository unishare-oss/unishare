import type { PostType } from '@/lib/posts/form-types'

export const POST_TYPES = ['NOTE', 'OLD_QUESTION', 'EXERCISE'] as const satisfies PostType[]

export const POST_TYPE_LABELS: Record<PostType, string> = {
  NOTE: 'Note',
  OLD_QUESTION: 'Old exam',
  EXERCISE: 'Exercise',
}

export type GuessedFields = {
  type?: PostType
  courseId?: string
  moduleNumber?: number
  examYear?: number
  title?: string
}

const UNTITLED_NAME = /^(img|dsc|pxl|scan|photo|screenshot|document|untitled|file)(?![a-z])/i
const MODULE_WORDS = /\b(?:module|week|lec(?:ture)?)\s*0*(\d+)(?!\d)/i
const COURSE_CODE = /\b[a-z]{2,4}\s?\d{3}\b/gi

/** Returns only the fields the file name makes clear. */
export function guessFromFileName(
  fileName: string,
  courses: { id: string; code: string }[],
): GuessedFields {
  const base = fileName.replace(/\.[^.]+$/, '')
  const spaced = base
    .replace(/([a-z])(\d)/gi, '$1 $2')
    .replace(/(\d)([a-z])/gi, '$1 $2')
    .replace(/[_-]+/g, ' ')
  const guess: GuessedFields = {}

  if (/\b(exam|midterm|final|past paper)s?\b/i.test(spaced)) guess.type = 'OLD_QUESTION'
  else if (/\b(exercise|homework|assignment|worksheet|problem set)s?\b/i.test(spaced)) {
    guess.type = 'EXERCISE'
  }

  const squashed = base.toLowerCase().replace(/[^a-z0-9]/g, '')
  guess.courseId = courses.find(
    (c) => c.code && squashed.includes(c.code.toLowerCase().replace(/[^a-z0-9]/g, '')),
  )?.id

  const moduleNumber = Number(MODULE_WORDS.exec(spaced)?.[1])
  if (moduleNumber >= 1 && moduleNumber <= 20) guess.moduleNumber = moduleNumber

  const year = Number(/\b(19[9]\d|20[0-2]\d)\b/.exec(spaced)?.[1])
  if (year) guess.examYear = year

  // The title keeps the module words and drops only the course code, as the demo does.
  const words = base
    .replace(/[_\-.]+/g, ' ')
    .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
  const title = words.replace(COURSE_CODE, '').replace(/\s+/g, ' ').trim()
  if (!UNTITLED_NAME.test(title) && /[a-z]{3}/i.test(title)) {
    guess.title = (title.charAt(0).toUpperCase() + title.slice(1)).slice(0, 200)
  }

  for (const key of Object.keys(guess) as (keyof GuessedFields)[]) {
    if (guess[key] === undefined) delete guess[key]
  }
  return guess
}

/**
 * Semester 1 starts in September, semester 2 in January, and the summer term in June. The API
 * does not expose its `ACADEMIC_START_MONTH`, so this uses the API's default of September.
 */
export function deriveSemester(now: Date): 1 | 2 | 3 {
  const month = now.getMonth()
  if (month >= 8) return 1
  if (month >= 5) return 3
  return 2
}
