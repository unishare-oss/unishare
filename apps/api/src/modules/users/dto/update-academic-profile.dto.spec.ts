import { BadRequestException, ValidationPipe } from '@nestjs/common'
import { UpdateAcademicProfileDto } from './update-academic-profile.dto'

// Same options as the global pipe in main.ts.
const pipe = new ValidationPipe({ whitelist: true, transform: true })

function validate(value: unknown) {
  return pipe.transform(value, { type: 'body', metatype: UpdateAcademicProfileDto })
}

describe('UpdateAcademicProfileDto', () => {
  it('rejects an empty departmentId', async () => {
    await expect(validate({ departmentId: '' })).rejects.toBeInstanceOf(BadRequestException)
  })

  it('accepts ids and null, which clears them', async () => {
    await expect(validate({ departmentId: 'd1' })).resolves.toEqual({ departmentId: 'd1' })
    await expect(validate({ departmentId: null })).resolves.toEqual({ departmentId: null })
  })

  it('keeps a universityId so the service can refuse it with 400 instead of dropping it', async () => {
    await expect(validate({ universityId: 'u1' })).resolves.toEqual({ universityId: 'u1' })
    await expect(validate({ universityId: null })).resolves.toEqual({ universityId: null })
  })
})
