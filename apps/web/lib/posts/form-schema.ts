import { z } from 'zod'

export const yearSchema = z.string().refine((value) => {
  const yearNumber = Number(value)
  return value !== '' && !Number.isNaN(yearNumber) && yearNumber >= 1 && yearNumber <= 6
}, 'Year must be between 1 and 6')

export const semesterSchema = z.string().refine((value) => {
  const semesterNumber = Number(value)
  return value !== '' && !Number.isNaN(semesterNumber) && semesterNumber >= 1 && semesterNumber <= 3
}, 'Semester must be between 1 and 3')

export const moduleNumberSchema = z.string().refine((value) => {
  const moduleNumber = Number(value)
  return value !== '' && !Number.isNaN(moduleNumber) && moduleNumber >= 1 && moduleNumber <= 20
}, 'Module number must be between 1 and 20')

export const examYearSchema = z.string().refine((value) => {
  const parsedExamYear = Number(value)
  return (
    value !== '' &&
    !Number.isNaN(parsedExamYear) &&
    parsedExamYear >= 1900 &&
    parsedExamYear <= 2100
  )
}, 'Exam year must be between 1900 and 2100')

export const externalUrlSchema = z
  .union([
    z.literal(''),
    z
      .string()
      .trim()
      .url('External URL must be a valid URL')
      .refine((value) => value.startsWith('https://'), 'External URL must be a valid URL'),
  ])
  .optional()

export function addExamYearIssueIfPresent(examYear: string, ctx: z.RefinementCtx) {
  if (!examYear) return

  const examYearResult = examYearSchema.safeParse(examYear)
  if (!examYearResult.success) {
    for (const issue of examYearResult.error.issues) {
      ctx.addIssue({
        ...issue,
        path: ['examYear'],
      })
    }
  }
}
