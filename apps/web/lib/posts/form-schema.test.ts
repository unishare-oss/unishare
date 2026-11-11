import { describe, expect, it } from 'vitest'
import { moduleNumberSchema } from './form-schema'

describe('moduleNumberSchema', () => {
  it.each(['1', '2', '3'])('accepts module %s', (value) => {
    expect(moduleNumberSchema.safeParse(value).success).toBe(true)
  })

  it.each(['', '0', '4', '20'])('rejects module "%s" with the module message', (value) => {
    const result = moduleNumberSchema.safeParse(value)
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Module must be between 1 and 3')
  })
})
