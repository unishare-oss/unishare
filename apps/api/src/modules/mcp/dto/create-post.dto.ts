import { z } from 'zod'

/**
 * A single attachment on a created post. Exactly one source must be provided:
 * - `key` (+ `size`): result of a prior `request_upload_url` call — the client already PUT the bytes to S3.
 * - `base64Data` / `textData`: small-payload fallback only; request_upload_url + key is the path for real files.
 */
export const postFileSchema = z
  .object({
    fileName: z.string().min(1).max(255),
    mimeType: z.string().min(1),
    key: z.string().min(1).max(500).optional(),
    size: z.number().int().positive().optional(),
    base64Data: z.string().max(680_000).optional(),
    textData: z.string().max(500_000).optional(),
  })
  .refine((f) => [f.key, f.base64Data, f.textData].filter(Boolean).length === 1, {
    message: 'Provide exactly one of key, base64Data, or textData',
  })
  .refine((f) => !f.key || f.size !== undefined, {
    message: 'size is required when key is provided',
  })

export const postFilesSchema = z.array(postFileSchema).max(5).optional()

export type PostFileDto = z.infer<typeof postFileSchema>

export const createPostSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(1).max(2000),
  type: z.enum(['NOTE', 'OLD_QUESTION', 'EXERCISE']),
  courseId: z.string().min(1),
  moduleNumber: z.number().int().min(1).max(20).optional(),
  year: z.number().int().min(1).max(6).optional(),
  semester: z.number().int().min(1).max(3).optional(),
  tags: z.array(z.string().min(2).max(50)).max(5).optional(),
  examYear: z.number().int().min(1900).max(2100).optional(),
  externalUrl: z.string().url().max(500).optional(),
  isAnonymous: z.boolean().optional(),
  files: postFilesSchema,
})

export type CreatePostDto = z.infer<typeof createPostSchema>
