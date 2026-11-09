import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuizBrowseFilters } from './QuizBrowseFilters'

beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

const engineering = { id: 'f-eng', name: 'Faculty of Engineering', universityId: 'u-kmutt' }
const science = { id: 'f-sci', name: 'Faculty of Science', universityId: 'u-kmutt' }

describe('QuizBrowseFilters department picker', () => {
  it('renders only the given departments, grouped by faculty', async () => {
    render(
      <QuizBrowseFilters
        departmentId=""
        courseId=""
        departments={[
          { id: 'd1', name: 'Mathematics', courseCount: 0, faculty: science },
          { id: 'd2', name: 'Computer Engineering', courseCount: 0, faculty: engineering },
        ]}
        courses={[]}
        onDepartmentChange={vi.fn()}
        onCourseChange={vi.fn()}
        onClear={vi.fn()}
      />,
    )
    await userEvent.click(screen.getAllByRole('combobox')[0])

    const listbox = await screen.findByRole('listbox')
    const groups = within(listbox).getAllByRole('group')
    expect(groups.map((g) => g.firstChild?.textContent)).toEqual([
      'Faculty of Engineering',
      'Faculty of Science',
    ])
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Computer Engineering', 'Mathematics'])
  })
})
