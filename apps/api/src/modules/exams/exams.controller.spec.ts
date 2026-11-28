import type { UserSession } from '@/auth/auth.config'
import type { UniversityScope } from '@/common/university-scope'
import { ExamsController } from './exams.controller'
import type { ExamsService } from './exams.service'

jest.mock('@/auth/auth.config', () => ({ auth: {} }))
jest.mock('@thallesp/nestjs-better-auth', () => ({
  Roles: () => () => undefined,
  Session: () => () => undefined,
}))

const SCOPE: UniversityScope = { kind: 'university', universityId: 'u1' }
const SESSION = { user: { id: 's1', departmentId: 'd1' } } as UserSession
const RANGE = { from: '2026-10-01', to: '2026-10-31' }

describe('ExamsController.findAll', () => {
  const findInRange = jest.fn()
  const controller = new ExamsController({ findInRange } as unknown as ExamsService)

  beforeEach(() => findInRange.mockReset())

  it("defaults the department to the member's own", () => {
    controller.findAll(RANGE, SESSION, SCOPE)
    expect(findInRange).toHaveBeenCalledWith('2026-10-01', '2026-10-31', SCOPE, {
      departmentId: 'd1',
      courseId: undefined,
      studentId: undefined,
    })
  })

  it('does not default the department when mine is set', () => {
    controller.findAll({ ...RANGE, mine: true }, SESSION, SCOPE)
    expect(findInRange).toHaveBeenCalledWith('2026-10-01', '2026-10-31', SCOPE, {
      departmentId: undefined,
      courseId: undefined,
      studentId: 's1',
    })
  })
})
