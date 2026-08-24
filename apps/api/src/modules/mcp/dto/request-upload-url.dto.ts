import { z } from 'zod'

export const requestUploadUrlSchema = z.object({
  mimeType: z.string().min(1),
  uploadType: z.enum(['document', 'image']),
})

export type RequestUploadUrlDto = z.infer<typeof requestUploadUrlSchema>
