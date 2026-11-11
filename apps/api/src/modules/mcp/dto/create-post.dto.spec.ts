import { createPostSchema } from './create-post.dto'

describe('MCP createPostSchema moduleNumber', () => {
  it.each([1, 2, 3])('accepts module %i', (moduleNumber) => {
    expect(createPostSchema.shape.moduleNumber.safeParse(moduleNumber).success).toBe(true)
  })

  it.each([0, 4, 20])('rejects module %i', (moduleNumber) => {
    expect(createPostSchema.shape.moduleNumber.safeParse(moduleNumber).success).toBe(false)
  })
})
