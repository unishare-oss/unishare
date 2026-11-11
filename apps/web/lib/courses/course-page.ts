import type { PostEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

/** Posts only have modules 1 to 3 (never weeks). */
export const COURSE_MODULES = [1, 2, 3] as const

export interface CourseModule {
  moduleNumber: number
  /** Notes in this module (the total from a limit-1 request). */
  total: number
  /** The newest note in this module. */
  newest?: PostEntity
  /** The request for this module failed; `total` is not known. */
  failed?: boolean
}

const MODULE_PREFIX = /^(?:module|week)\s*\d+\s*(?::|-)\s*/i

/** A note's title without a leading "Module N:", "Week N:" or "Module N -" prefix. */
export function moduleTopicName(title: string | null | undefined): string {
  const trimmed = (title ?? '').trim()
  if (!trimmed) return 'Untitled note'
  const stripped = trimmed.replace(MODULE_PREFIX, '').trim()
  return stripped || trimmed
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

/** "Module 2 · Hash tables · 4 notes": the row label, also used for Up next. */
export function topicLabel({ moduleNumber, total, newest }: CourseModule): string {
  return `Module ${moduleNumber} · ${moduleTopicName(newest?.title)} · ${plural(total, 'note')}`
}
