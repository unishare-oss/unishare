import { z } from 'zod'

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/)
const drawingStyleSchema = {
  strokeColor: hexColorSchema.optional(),
  backgroundColor: z.union([z.literal('transparent'), hexColorSchema]).optional(),
}

const drawingPointSchema = z.tuple([z.number(), z.number()])

export const drawingElementSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.enum(['rectangle', 'ellipse', 'diamond']),
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
    ...drawingStyleSchema,
  }),
  z.object({
    type: z.literal('text'),
    x: z.number(),
    y: z.number(),
    text: z.string().min(1),
    ...drawingStyleSchema,
  }),
  z
    .object({
      type: z.literal('arrow'),
      x: z.number(),
      y: z.number(),
      endX: z.number().optional(),
      endY: z.number().optional(),
      points: z.array(drawingPointSchema).min(2).optional(),
      ...drawingStyleSchema,
    })
    .refine((input) => input.points || (input.endX !== undefined && input.endY !== undefined), {
      message: 'Arrows need points or both endX and endY',
    }),
])

export const drawingElementsSchema = z.array(drawingElementSchema).min(1).max(100)

export const drawBoardSchema = z.object({
  slug: z.string().min(1),
  elements: z.string().min(2),
})

export type DrawBoardDto = z.infer<typeof drawBoardSchema>
