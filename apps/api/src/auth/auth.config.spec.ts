import { parseUserInput } from 'better-auth/db'
import { auth } from './auth.config'

describe('auth config', () => {
  // Better Auth starts uniauth discovery on creation; let it settle (it fails offline) first.
  beforeAll(() => auth.$context.catch(() => undefined))

  it("refuses universityId on update-user: only uniauth sets a member's university", () => {
    // The same parsing Better Auth's /update-user runs on the request body
    expect(() => parseUserInput(auth.options, { universityId: 'u1' }, 'update')).toThrow(
      expect.objectContaining({ body: expect.objectContaining({ code: 'FIELD_NOT_ALLOWED' }) }),
    )
  })
})
