import { BadRequestException, ValidationPipe } from '@nestjs/common'
import { MentionableQueryDto } from './mentionable-query.dto'

// Same options as the global pipe in main.ts.
const pipe = new ValidationPipe({ whitelist: true, transform: true })

function validate(value: unknown) {
  return pipe.transform(value, { type: 'query', metatype: MentionableQueryDto })
}

describe('MentionableQueryDto', () => {
  it('rejects a q longer than 50 characters', async () => {
    await expect(validate({ q: 'a'.repeat(51) })).rejects.toBeInstanceOf(BadRequestException)
  })

  it('accepts a missing or short q', async () => {
    await expect(validate({})).resolves.toEqual({})
    await expect(validate({ q: 'ja' })).resolves.toEqual({ q: 'ja' })
  })
})
