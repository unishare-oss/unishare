import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { CreatePostDto } from './create-post.dto'

async function moduleNumberErrors(moduleNumber: number) {
  const dto = plainToInstance(CreatePostDto, { moduleNumber })
  const errors = await validate(dto, { whitelist: false })
  return errors.filter((error) => error.property === 'moduleNumber')
}

describe('CreatePostDto moduleNumber', () => {
  it.each([1, 2, 3])('accepts module %i', async (moduleNumber) => {
    expect(await moduleNumberErrors(moduleNumber)).toHaveLength(0)
  })

  it.each([0, 4, 20])('rejects module %i', async (moduleNumber) => {
    expect(await moduleNumberErrors(moduleNumber)).not.toHaveLength(0)
  })
})
