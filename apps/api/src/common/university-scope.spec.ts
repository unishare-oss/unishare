import { courseInScope, deckInScope, postInScope, universityScope } from './university-scope'

describe('universityScope', () => {
  it('gives an admin every university, with or without a university of their own', () => {
    expect(universityScope({ role: 'ADMIN', universityId: 'u1' })).toEqual({ kind: 'all' })
    expect(universityScope({ role: 'ADMIN', universityId: null })).toEqual({ kind: 'all' })
  })

  it.each(['STUDENT', 'MODERATOR'])('gives a %s their own university', (role) => {
    expect(universityScope({ role, universityId: 'u1' })).toEqual({
      kind: 'university',
      universityId: 'u1',
    })
  })

  it('gives a member with no university nothing', () => {
    expect(universityScope({ role: 'STUDENT', universityId: null })).toEqual({ kind: 'none' })
    expect(universityScope({ role: 'STUDENT' })).toEqual({ kind: 'none' })
  })

  it('gives a signed-out request nothing', () => {
    expect(universityScope(undefined)).toEqual({ kind: 'none' })
    expect(universityScope(null)).toEqual({ kind: 'none' })
  })
})

describe('postInScope', () => {
  it('filters nothing for all', () => {
    expect(postInScope({ kind: 'all' })).toEqual({})
  })

  it("filters by the course's university for a university", () => {
    expect(postInScope({ kind: 'university', universityId: 'u1' })).toEqual({
      course: { department: { faculty: { universityId: 'u1' } } },
    })
  })

  it('matches no post for none', () => {
    expect(postInScope({ kind: 'none' })).toEqual({ id: { in: [] } })
  })
})

describe('courseInScope', () => {
  it('filters nothing for all', () => {
    expect(courseInScope({ kind: 'all' })).toEqual({})
  })

  it("filters by the department's university for a university", () => {
    expect(courseInScope({ kind: 'university', universityId: 'u1' })).toEqual({
      department: { faculty: { universityId: 'u1' } },
    })
  })

  it('matches no course for none', () => {
    expect(courseInScope({ kind: 'none' })).toEqual({ id: { in: [] } })
  })
})

describe('deckInScope', () => {
  it('filters nothing for all', () => {
    expect(deckInScope({ kind: 'all' })).toEqual({})
  })

  it("matches the owner's university or the source post's university", () => {
    expect(deckInScope({ kind: 'university', universityId: 'u1' })).toEqual({
      OR: [
        { owner: { universityId: 'u1' } },
        { sourcePost: { course: { department: { faculty: { universityId: 'u1' } } } } },
      ],
    })
  })

  it('matches no deck for none', () => {
    expect(deckInScope({ kind: 'none' })).toEqual({ id: { in: [] } })
  })
})
