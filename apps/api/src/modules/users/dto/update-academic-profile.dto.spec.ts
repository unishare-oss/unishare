import { BadRequestException, ValidationPipe } from '@nestjs/common'
import { UpdateAcademicProfileDto } from './update-academic-profile.dto'

// Same options as the global pipe in main.ts.
const pipe = new ValidationPipe({ whitelist: true, transform: true })

function validate(value: unknown) {
  return pipe.transform(value, { type: 'body', metatype: UpdateAcademicProfileDto })
}

describe('UpdateAcademicProfileDto', () => {
  it('rejects an empty departmentId or universityId', async () => {
    await expect(validate({ departmentId: '' })).rejects.toBeInstanceOf(BadRequestException)
    await expect(validate({ universityId: '' })).rejects.toBeInstanceOf(BadRequestException)
  })

  it('accepts ids and null, which clears them', async () => {
    await expect(validate({ departmentId: 'd1', universityId: 'u1' })).resolves.toEqual({
      departmentId: 'd1',
      universityId: 'u1',
    })
    await expect(validate({ departmentId: null, universityId: null })).resolves.toEqual({
      departmentId: null,
      universityId: null,
    })
  })
})
