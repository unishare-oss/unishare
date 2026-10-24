import { BadRequestException, ValidationPipe } from '@nestjs/common'
import { CreateCommentDto } from './create-comment.dto'
import { UpdateCommentDto } from './update-comment.dto'

// Same options as the global pipe in main.ts.
const pipe = new ValidationPipe({ whitelist: true, transform: true })

function validate<T>(metatype: new () => T, value: unknown) {
  return pipe.transform(value, { type: 'body', metatype }) as Promise<T>
}

describe('comment DTOs', () => {
  it('rejects more than 20 mentions on create', async () => {
    const mentions = Array.from({ length: 21 }, (_, i) => `u${i}`)
    await expect(validate(CreateCommentDto, { content: 'hi', mentions })).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })

  it('accepts up to 20 mentions on create', async () => {
    const mentions = Array.from({ length: 20 }, (_, i) => `u${i}`)
    await expect(validate(CreateCommentDto, { content: 'hi', mentions })).resolves.toMatchObject({
      mentions,
    })
  })

  it('keeps mentions on an edit', async () => {
    const dto = await validate(UpdateCommentDto, { content: 'edited', mentions: ['u1'] })
    expect(dto).toEqual({ content: 'edited', mentions: ['u1'] })
  })

  it('accepts an edit without mentions', async () => {
    const dto = await validate(UpdateCommentDto, { content: 'edited' })
    expect(dto).toEqual({ content: 'edited' })
  })

  it('rejects more than 20 mentions on an edit', async () => {
    const mentions = Array.from({ length: 21 }, (_, i) => `u${i}`)
    await expect(validate(UpdateCommentDto, { mentions })).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })
})
