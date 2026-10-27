import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  myDepartments: { departments: [] as unknown[], isLoading: false, noUniversity: false },
}))

vi.mock('@/hooks/use-my-departments', () => ({ useMyDepartments: () => mocks.myDepartments }))
vi.mock('@/src/lib/api/generated/courses/courses', () => ({
  useCoursesControllerFindAll: () => ({ data: { items: [] } }),
}))
// Capture the label the strip computes; the department select itself is not rendered.
const dropdownProps = vi.hoisted(() => ({ last: null as null | { selectedDeptLabel: string } }))
vi.mock('@/components/feed/dropdown-filters', () => ({
  DropdownFilters: (props: { selectedDeptLabel: string }) => {
    dropdownProps.last = props
    return null
  },
}))

// Render the desktop popover's content inline so the filters mount without opening it.
vi.mock('@/components/ui/popover', () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <>{children}</>
  return { Popover: Pass, PopoverTrigger: Pass, PopoverContent: Pass, PopoverClose: Pass }
})

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

describe('FilterStrip department label', () => {
  it("labels a department from the user's university by name", () => {
    mocks.myDepartments = { departments: [cpe], isLoading: false, noUniversity: false }
    const { onDeptChange } = renderStrip('d-cpe')
    expect(dropdownProps.last?.selectedDeptLabel).toBe('Computer Engineering')
    expect(onDeptChange).not.toHaveBeenCalled()
  })

  it('falls back to all departments for a persisted department outside the scope', () => {
    mocks.myDepartments = { departments: [cpe], isLoading: false, noUniversity: false }
    const { onDeptChange, onCourseChange } = renderStrip('d-stale')
    expect(dropdownProps.last?.selectedDeptLabel).toBe('All departments')
    expect(onDeptChange).toHaveBeenCalledWith('')
    expect(onCourseChange).toHaveBeenCalledWith('')
  })

  it('keeps the selection while departments are still loading', () => {
    mocks.myDepartments = { departments: [], isLoading: true, noUniversity: false }
    const { onDeptChange } = renderStrip('d-cpe')
    expect(onDeptChange).not.toHaveBeenCalled()
  })
})
