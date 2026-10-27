import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mocks = vi.hoisted(() => ({
  myDepartments: {
    departments: [] as unknown[],
    isLoading: false,
    noUniversity: false,
  },
}))

vi.mock('@/hooks/use-my-departments', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-my-departments')>()),
  useMyDepartments: () => mocks.myDepartments,
}))
vi.mock('@/src/lib/api/generated/users/users', () => ({
  useUsersControllerUpdateAcademicProfile: () => ({ mutate: vi.fn(), isPending: false }),
  getUsersControllerGetMeQueryKey: () => ['me'],
}))
vi.mock('@/src/lib/api/generated/posts/posts', () => ({
  getPostsControllerFindAllQueryKey: () => ['posts'],
}))
vi.mock('@/lib/store', () => ({
  useFeedStore: (select: (s: { setSelectedDeptId: () => void }) => unknown) =>
    select({ setSelectedDeptId: vi.fn() }),
}))

const { AcademicProfileModal } = await import('./academic-profile-modal')

// Radix Select needs these in jsdom.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

function renderModal() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AcademicProfileModal requireDepartment onSkip={vi.fn()} />
    </QueryClientProvider>,
  )
}

const engineering = { id: 'f-eng', name: 'Faculty of Engineering', universityId: 'u-kmutt' }
const science = { id: 'f-sci', name: 'Faculty of Science', universityId: 'u-kmutt' }

describe('AcademicProfileModal department picker', () => {
  it("groups the user's university departments by faculty", async () => {
    mocks.myDepartments = {
      departments: [
        { id: 'd1', name: 'Physics', courseCount: 0, faculty: science },
        { id: 'd2', name: 'Computer Engineering', courseCount: 0, faculty: engineering },
        { id: 'd3', name: 'Civil Engineering', courseCount: 0, faculty: engineering },
      ],
      isLoading: false,
      noUniversity: false,
    }
    renderModal()
    await userEvent.click(screen.getByRole('combobox'))

    const listbox = await screen.findByRole('listbox')
    const groups = within(listbox).getAllByRole('group')
    expect(groups).toHaveLength(2)
    expect(within(groups[0]).getByText('Faculty of Engineering')).toBeInTheDocument()
    expect(
      within(groups[0])
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Civil Engineering', 'Computer Engineering'])
    expect(within(groups[1]).getByText('Faculty of Science')).toBeInTheDocument()
    expect(within(groups[1]).getByRole('option', { name: 'Physics' })).toBeInTheDocument()
    // Only the placeholder plus the three departments returned for the user's university.
    expect(within(listbox).getAllByRole('option')).toHaveLength(4)
  })

  it('explains the empty list when the user has no university', () => {
    mocks.myDepartments = { departments: [], isLoading: false, noUniversity: true }
    renderModal()
    expect(screen.getByText(/Your university isn't set yet/)).toBeInTheDocument()
  })
})
