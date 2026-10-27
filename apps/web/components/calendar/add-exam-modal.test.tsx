import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const engineering = { id: 'f-eng', name: 'Faculty of Engineering', universityId: 'u-kmutt' }

vi.mock('@/hooks/use-my-departments', () => ({
  useMyDepartments: () => ({
    departments: [
      { id: 'd1', name: 'Computer Engineering', courseCount: 0, faculty: engineering },
      { id: 'd2', name: 'Civil Engineering', courseCount: 0, faculty: engineering },
    ],
    isLoading: false,
    noUniversity: false,
  }),
}))
vi.mock('@/src/lib/api/generated/courses/courses', () => ({
  useCoursesControllerFindAll: () => ({ data: { items: [] } }),
}))

const { AddExamModal, EMPTY_EXAM_FORM } = await import('./add-exam-modal')

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

describe('AddExamModal department picker', () => {
  it("offers only the user's university departments", () => {
    render(
      <AddExamModal
        open
        value={EMPTY_EXAM_FORM}
        onChange={vi.fn()}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    fireEvent.focus(screen.getByPlaceholderText('Select a department…'))

    expect(screen.getByText('Computer Engineering')).toBeInTheDocument()
    expect(screen.getByText('Civil Engineering')).toBeInTheDocument()
    expect(screen.queryByText('School of Information Technology')).not.toBeInTheDocument()
  })
})
