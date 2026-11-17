import { CoursesController } from './courses.controller'
import { CoursesService } from './courses.service'
import { UniversityScope } from '@/common/university-scope'

describe('CoursesController suggestions', () => {
  it('passes the authenticated user and university scope to matching', async () => {
    const suggest = jest.fn().mockResolvedValue({ suggestions: [], available: true })
    const controller = new CoursesController({ suggest } as unknown as CoursesService)
    const dto = {
      departmentId: 'd1',
      files: [{ key: 'k1', name: 'notes.pdf', mimeType: 'application/pdf' }],
    }
    const session = { user: { id: 'u1' } } as any
    const scope: UniversityScope = { kind: 'university', universityId: 'uni1' }

    await expect(controller.suggest(dto, session, scope)).resolves.toEqual({
      suggestions: [],
      available: true,
    })
    expect(suggest).toHaveBeenCalledWith(dto, 'u1', scope)
  })
})
