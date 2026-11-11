import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { ReplaceCourseOutlineDto } from './replace-course-outline.dto'

const entry = (moduleNumber: number) => ({ moduleNumber, topics: ['Intro'] })

async function modulesErrors(modules: unknown[]) {
  const dto = plainToInstance(ReplaceCourseOutlineDto, { modules })
  const errors = await validate(dto)
  return errors.filter((error) => error.property === 'modules')
}

describe('ReplaceCourseOutlineDto modules', () => {
  it('accepts a full outline of three modules', async () => {
    expect(await modulesErrors([entry(1), entry(2), entry(3)])).toHaveLength(0)
  })

  it('rejects more than three modules', async () => {
    expect(await modulesErrors([entry(1), entry(2), entry(3), entry(1)])).not.toHaveLength(0)
  })
})
