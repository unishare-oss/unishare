import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

type Option = { value: string; label: string }

const mocks = vi.hoisted(() => ({
  departmentsParams: vi.fn(),
  departments: [] as unknown[],
  universities: { data: undefined as unknown, isError: false },
  selects: [] as { options: Option[]; disabled?: boolean }[],
}))

vi.mock('@/src/lib/api/generated/departments/departments', () => ({
  useDepartmentsControllerFindAll: (params: unknown) => {
    mocks.departmentsParams(params)
    return { data: mocks.departments }
  },
}))
vi.mock('@/src/lib/api/generated/universities/universities', () => ({
  useUniversitiesControllerFindAll: () => mocks.universities,
}))
vi.mock('@/src/lib/api/generated/courses/courses', () => ({
  useCoursesControllerFindAll: () => ({ data: { items: [] } }),
}))
vi.mock('@/components/ui/search-select', () => ({
  SearchSelect: (props: { options: Option[]; disabled?: boolean }) => {
    mocks.selects.push(props)
    return null
  },
}))

const { CourseSelector } = await import('./CourseSelector')

const dept = (id: string, name: string, universityId: string, faculty = 'Engineering') => ({
  id,
  name,
  faculty: { id: `${universityId}-${faculty}`, name: faculty, universityId },
})

function renderSelector() {
  mocks.selects = []
  render(
    <CourseSelector
      deptId=""
      yearLevel=""
      courseId=""
      onDeptChange={vi.fn()}
      onYearChange={vi.fn()}
      onCourseChange={vi.fn()}
      disabled={false}
    />,
  )
  // The first SearchSelect is the department picker
  return mocks.selects[0]
}

afterEach(cleanup)
beforeEach(() => {
  mocks.departments = [
    dept('d1', 'Computer Engineering', 'u-kmutt'),
    dept('d2', 'Computer Engineering', 'u-mfu'),
  ]
  mocks.universities = {
    data: [
      { id: 'u-kmutt', name: 'KMUTT University', shortName: 'KMUTT' },
      { id: 'u-mfu', name: 'Mae Fah Luang University', shortName: 'MFU' },
    ],
    isError: false,
  }
})

describe('CourseSelector', () => {
  it("lists every university's departments, labelled with the university", () => {
    const select = renderSelector()
    expect(mocks.departmentsParams).toHaveBeenCalledWith(undefined)
    expect(select.options).toEqual([
      { value: 'd1', label: 'Computer Engineering (KMUTT)' },
      { value: 'd2', label: 'Computer Engineering (MFU)' },
    ])
    expect(select.disabled).toBe(false)
  })

  it('uses the full university name when two universities share a short name', () => {
    mocks.universities.data = [
      { id: 'u-mahidol', name: 'Mahidol University', shortName: 'MU' },
      { id: 'u-maejo', name: 'Maejo University', shortName: 'MU' },
    ]
    mocks.departments = [dept('d1', 'Biology', 'u-mahidol'), dept('d2', 'Biology', 'u-maejo')]
    expect(renderSelector().options.map((o) => o.label)).toEqual([
      'Biology (Mahidol University)',
      'Biology (Maejo University)',
    ])
  })

  it('adds the faculty when a department name repeats inside one university', () => {
    mocks.departments = [
      dept('d1', 'Design', 'u-kmutt', 'Architecture'),
      dept('d2', 'Design', 'u-kmutt', 'Engineering'),
    ]
    expect(renderSelector().options.map((o) => o.label)).toEqual([
      'Design (Architecture, KMUTT)',
      'Design (Engineering, KMUTT)',
    ])
  })

  it('offers no departments until universities load', () => {
    mocks.universities = { data: undefined, isError: false }
    const select = renderSelector()
    expect(select.options).toEqual([])
    expect(select.disabled).toBe(true)
  })

  it('says so when universities fail to load', () => {
    mocks.universities = { data: undefined, isError: true }
    expect(renderSelector().disabled).toBe(true)
    expect(screen.getByText(/Couldn.t load universities/)).toBeInTheDocument()
  })
})
