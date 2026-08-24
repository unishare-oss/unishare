import { z } from 'zod'

export const deletePostSchema = z.object({
  id: z.string().min(1),
})

export type DeletePostDto = z.infer<typeof deletePostSchema>
