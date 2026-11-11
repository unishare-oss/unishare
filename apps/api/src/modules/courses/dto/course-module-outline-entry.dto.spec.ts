import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { CourseModuleOutlineEntryDto } from './course-module-outline-entry.dto'

async function moduleNumberErrors(moduleNumber: number) {
  const dto = plainToInstance(CourseModuleOutlineEntryDto, { moduleNumber, topics: ['Intro'] })
  const errors = await validate(dto)
  return errors.filter((error) => error.property === 'moduleNumber')
}

describe('CourseModuleOutlineEntryDto moduleNumber', () => {
  it.each([1, 2, 3])('accepts module %i', async (moduleNumber) => {
    expect(await moduleNumberErrors(moduleNumber)).toHaveLength(0)
  })

  it.each([0, 4, 20])('rejects module %i', async (moduleNumber) => {
    expect(await moduleNumberErrors(moduleNumber)).not.toHaveLength(0)
  })
})
