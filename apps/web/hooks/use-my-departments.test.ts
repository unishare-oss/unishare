import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: {
    user: null as { university?: { id: string } | null } | null,
    isAuthenticated: false,
    isLoading: false,
  },
  findAll: vi.fn(),
}))

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => mocks.auth }))
vi.mock('@/src/lib/api/generated/departments/departments', () => ({
  useDepartmentsControllerFindAll: (...args: unknown[]) => mocks.findAll(...args),
}))

const { useMyDepartments, groupByFaculty } = await import('./use-my-departments')

const engineering = { id: 'f-eng', name: 'Engineering', universityId: 'u-kmutt' }
const science = { id: 'f-sci', name: 'Science', universityId: 'u-kmutt' }
const dept = (id: string, name: string, faculty = engineering) => ({
  id,
  name,
  courseCount: 0,
  faculty,
})

/** The hook only calls mocked hooks, so it runs without renderHook. */
function callHook(options?: { staleTime?: number }) {
  mocks.findAll.mockClear()
  const result = useMyDepartments(options)
  const [params, hookOptions] = mocks.findAll.mock.calls[0] as [
    { universityId?: string } | undefined,
    {
      query: {
        enabled: boolean
        staleTime?: number
        select: (r: { data: unknown }) => unknown
      }
    },
  ]
  return { result, params, query: hookOptions.query }
}

describe('useMyDepartments', () => {
  beforeEach(() => {
    mocks.findAll.mockReturnValue({ data: [dept('d1', 'Computer')], isLoading: false })
  })

  it("passes the signed-in user's universityId and unwraps the envelope", () => {
    mocks.auth = {
      user: { university: { id: 'u-kmutt' } },
      isAuthenticated: true,
      isLoading: false,
    }
    const { result, params, query } = callHook()
    expect(params).toEqual({ universityId: 'u-kmutt' })
    expect(query.enabled).toBe(true)
    expect(query.select({ data: ['x'] })).toEqual(['x'])
    expect(result.departments).toHaveLength(1)
    expect(result.noUniversity).toBe(false)
  })

  it('reports loaded only after a successful fetch, not after a failed one', () => {
    mocks.auth = {
      user: { university: { id: 'u-kmutt' } },
      isAuthenticated: true,
      isLoading: false,
    }
    mocks.findAll.mockReturnValue({ data: [], isLoading: false, isSuccess: true })
    expect(callHook().result.loaded).toBe(true)

    mocks.findAll.mockReturnValue({ data: undefined, isLoading: false, isSuccess: false })
    const { result } = callHook()
    expect(result.departments).toEqual([])
    expect(result.loaded).toBe(false)
  })

  it('shows nothing and flags noUniversity for a signed-in user without a university', () => {
    mocks.auth = { user: { university: null }, isAuthenticated: true, isLoading: false }
    const { result, params, query } = callHook()
    expect(params).toBeUndefined()
    expect(query.enabled).toBe(false)
    expect(result.departments).toEqual([])
    expect(result.noUniversity).toBe(true)
  })

  it('waits for auth before fetching, so no unscoped list flashes', () => {
    mocks.auth = { user: null, isAuthenticated: true, isLoading: true }
    const { result, query } = callHook()
    expect(query.enabled).toBe(false)
    expect(result.isLoading).toBe(true)
    expect(result.departments).toEqual([])
  })

  it('does not report a missing university when the profile failed to load', () => {
    // Signed in, auth no longer loading, but getMe errored so there is no profile.
    mocks.auth = { user: null, isAuthenticated: true, isLoading: false }
    const { result, query } = callHook()
    expect(query.enabled).toBe(false)
    expect(result.departments).toEqual([])
    expect(result.noUniversity).toBe(false)
  })

  it('passes a caller staleTime through to the query', () => {
    mocks.auth = {
      user: { university: { id: 'u-kmutt' } },
      isAuthenticated: true,
      isLoading: false,
    }
    expect(callHook({ staleTime: 300_000 }).query.staleTime).toBe(300_000)
  })

  it('fetches every department for signed-out visitors', () => {
    mocks.auth = { user: null, isAuthenticated: false, isLoading: false }
    const { result, params, query } = callHook()
    expect(params).toBeUndefined()
    expect(query.enabled).toBe(true)
    expect(result.departments).toHaveLength(1)
    expect(result.noUniversity).toBe(false)
  })
})

describe('groupByFaculty', () => {
  it('orders groups by faculty name and departments by name', () => {
    const groups = groupByFaculty([
      dept('d1', 'Physics', science),
      dept('d2', 'Mechanical', engineering),
      dept('d3', 'Chemistry', science),
      dept('d4', 'Civil', engineering),
    ])
    expect(groups.map((g) => g.faculty.name)).toEqual(['Engineering', 'Science'])
    expect(groups[0].departments.map((d) => d.name)).toEqual(['Civil', 'Mechanical'])
    expect(groups[1].departments.map((d) => d.name)).toEqual(['Chemistry', 'Physics'])
  })

  it('keeps same-named faculties of different universities apart', () => {
    const otherEngineering = { id: 'f-eng-mfu', name: 'Engineering', universityId: 'u-mfu' }
    const groups = groupByFaculty([dept('d1', 'A'), dept('d2', 'B', otherEngineering)])
    expect(groups).toHaveLength(2)
  })

  it('returns no groups for an empty list', () => {
    expect(groupByFaculty([])).toEqual([])
  })
})
