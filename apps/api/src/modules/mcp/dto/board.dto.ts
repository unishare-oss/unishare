import { z } from 'zod'

export const createBoardSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  visibility: z.enum(['OPEN', 'VIEW_ONLY', 'PRIVATE']).optional(),
})

export type CreateBoardDto = z.infer<typeof createBoardSchema>

export const boardSlugSchema = z.object({
  slug: z.string().min(1),
})

export type BoardSlugDto = z.infer<typeof boardSlugSchema>
