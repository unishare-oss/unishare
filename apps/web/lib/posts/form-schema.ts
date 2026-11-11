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
  return value !== '' && !Number.isNaN(moduleNumber) && moduleNumber >= 1 && moduleNumber <= 3
}, 'Module must be between 1 and 3')

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

const postTypeSchema = z.enum(['NOTE', 'OLD_QUESTION', 'EXERCISE'])

export const createPostFormSchema = z
  .object({
    postType: postTypeSchema.nullable().refine((value) => value !== null, 'Post type is required'),
    selectedDept: z.string(),
    selectedCourse: z.string().min(1, 'Course is required'),
    title: z.string().trim().min(3, 'Give it a title of at least 3 letters.'),
    description: z.string().trim().max(2000, 'Description can be up to 2000 characters'),
    year: yearSchema,
    semester: semesterSchema,
    moduleNum: z.string(),
    examYear: z.string(),
    externalUrl: externalUrlSchema,
    files: z.array(z.custom<File>((value) => value instanceof File)),
    homeworkConfirmed: z.boolean().optional(),
  })
  .superRefine((values, ctx) => {
    const moduleResult = moduleNumberSchema.safeParse(values.moduleNum)
    if (!moduleResult.success) {
      for (const issue of moduleResult.error.issues) {
        ctx.addIssue({ ...issue, path: ['moduleNum'] })
      }
    }

    if (values.postType === 'OLD_QUESTION') {
      addExamYearIssueIfPresent(values.examYear, ctx)
    }

    if (values.postType === 'EXERCISE' && !values.homeworkConfirmed) {
      ctx.addIssue({
        code: 'custom',
        path: ['homeworkConfirmed'],
        message: 'Please confirm this is not graded homework',
      })
    }
  })
