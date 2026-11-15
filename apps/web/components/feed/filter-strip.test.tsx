import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  myDepartments: { departments: [] as unknown[], loaded: true, noUniversity: false },
}))

vi.mock('@/hooks/use-my-departments', () => ({ useMyDepartments: () => mocks.myDepartments }))
vi.mock('@/src/lib/api/generated/courses/courses', () => ({
  useCoursesControllerFindAll: () => ({ data: { items: [] } }),
}))
const { FilterStrip } = await import('./filter-strip')

afterEach(cleanup)

const engineering = { id: 'f-eng', name: 'Faculty of Engineering', universityId: 'u-kmutt' }
const cpe = { id: 'd-cpe', name: 'Computer Engineering', courseCount: 0, faculty: engineering }

function renderStrip(selectedDeptId: string) {
  const onDeptChange = vi.fn()
  const onCourseChange = vi.fn()
  render(
    <FilterStrip
      activeFilter="ALL"
      onFilterChange={vi.fn()}
      selectedDeptId={selectedDeptId}
      onDeptChange={onDeptChange}
      selectedYear={null}
      onYearChange={vi.fn()}
      selectedCourseId=""
      onCourseChange={onCourseChange}
      selectedModuleNumber={null}
      onModuleChange={vi.fn()}
    />,
  )
  return { onDeptChange, onCourseChange }
}

describe('FilterStrip department scope', () => {
  it("keeps a department from the user's university", () => {
    mocks.myDepartments = { departments: [cpe], loaded: true, noUniversity: false }
    const { onDeptChange } = renderStrip('d-cpe')
    expect(onDeptChange).not.toHaveBeenCalled()
  })

  it('falls back to all departments for a persisted department outside the scope', () => {
    mocks.myDepartments = { departments: [cpe], loaded: true, noUniversity: false }
    const { onDeptChange, onCourseChange } = renderStrip('d-stale')
    expect(onDeptChange).toHaveBeenCalledWith('')
    expect(onCourseChange).toHaveBeenCalledWith('')
  })

  it('keeps the selection while departments are still loading', () => {
    mocks.myDepartments = { departments: [], loaded: false, noUniversity: false }
    const { onDeptChange } = renderStrip('d-cpe')
    expect(onDeptChange).not.toHaveBeenCalled()
  })

  it('clears a persisted department when the user has no university', () => {
    mocks.myDepartments = { departments: [], loaded: false, noUniversity: true }
    const { onDeptChange, onCourseChange } = renderStrip('d-cpe')
    expect(onDeptChange).toHaveBeenCalledWith('')
    expect(onCourseChange).toHaveBeenCalledWith('')
  })

  it("clears a persisted department when the user's university has no departments", () => {
    mocks.myDepartments = { departments: [], loaded: true, noUniversity: false }
    const { onDeptChange } = renderStrip('d-cpe')
    expect(onDeptChange).toHaveBeenCalledWith('')
  })
})

describe('FilterStrip controls', () => {
  it('shows the type chips and the sort, year, module and course selects, with no drawer', () => {
    mocks.myDepartments = { departments: [cpe], loaded: true, noUniversity: false }
    renderStrip('d-cpe')
    expect(screen.getAllByRole('button', { pressed: false }).map((b) => b.textContent)).toEqual([
      'Notes',
      'Past exams',
      'Exercises',
    ])
    expect(screen.getByRole('button', { name: 'All', pressed: true })).toBeInTheDocument()
    for (const name of ['Sort', 'Year', 'Module', 'Course']) {
      expect(screen.getByRole('combobox', { name })).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: /Filters/ })).not.toBeInTheDocument()
  })
})
