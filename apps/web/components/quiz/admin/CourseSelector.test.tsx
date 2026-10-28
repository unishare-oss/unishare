import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  departmentsParams: vi.fn(),
  options: [] as { value: string; label: string }[][],
}))

vi.mock('@/src/lib/api/generated/departments/departments', () => ({
  useDepartmentsControllerFindAll: (params: unknown) => {
    mocks.departmentsParams(params)
    return {
      data: [
        { id: 'd1', name: 'Computer Engineering', faculty: { universityId: 'u-kmutt' } },
        { id: 'd2', name: 'Computer Engineering', faculty: { universityId: 'u-mfu' } },
      ],
    }
  },
}))
vi.mock('@/src/lib/api/generated/universities/universities', () => ({
  useUniversitiesControllerFindAll: () => ({
    data: [
      { id: 'u-kmutt', shortName: 'KMUTT' },
      { id: 'u-mfu', shortName: 'MFU' },
    ],
  }),
}))
vi.mock('@/src/lib/api/generated/courses/courses', () => ({
  useCoursesControllerFindAll: () => ({ data: { items: [] } }),
}))
vi.mock('@/components/ui/search-select', () => ({
  SearchSelect: ({ options }: { options: { value: string; label: string }[] }) => {
    mocks.options.push(options)
    return null
  },
}))

const { CourseSelector } = await import('./CourseSelector')

afterEach(cleanup)

describe('CourseSelector', () => {
  it("lists every university's departments, labelled with the university", () => {
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

    expect(mocks.departmentsParams).toHaveBeenCalledWith(undefined)
    // The first SearchSelect is the department picker
    expect(mocks.options[0]).toEqual([
      { value: 'd1', label: 'Computer Engineering (KMUTT)' },
      { value: 'd2', label: 'Computer Engineering (MFU)' },
    ])
  })
})
