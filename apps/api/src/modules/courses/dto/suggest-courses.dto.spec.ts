import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { SuggestCoursesDto } from './suggest-courses.dto'

describe('SuggestCoursesDto', () => {
  it('rejects more than ten files', async () => {
    const dto = plainToInstance(SuggestCoursesDto, {
      departmentId: 'd1',
      files: Array.from({ length: 11 }, (_, index) => ({
        key: `posts/u1/${index}.pdf`,
        mimeType: 'application/pdf',
      })),
    })

    const errors = await validate(dto)
    expect(errors.map(({ property }) => property)).toContain('files')
  })
})
