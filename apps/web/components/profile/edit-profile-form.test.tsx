import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { UserProfileEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

const mocks = vi.hoisted(() => ({
  updateMe: vi.fn(),
  updateAcademic: vi.fn(),
  toastError: vi.fn(),
}))

const engineering = { id: 'f-eng', name: 'Faculty of Engineering', universityId: 'u-kmutt' }
const science = { id: 'f-sci', name: 'Faculty of Science', universityId: 'u-kmutt' }

vi.mock('@/hooks/use-my-departments', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-my-departments')>()),
  useMyDepartments: () => ({
    departments: [
      { id: 'd-phys', name: 'Physics', courseCount: 0, faculty: science },
      { id: 'd-cpe', name: 'Computer Engineering', courseCount: 0, faculty: engineering },
    ],
    isLoading: false,
    noUniversity: false,
  }),
}))
vi.mock('@/src/lib/api/generated/universities/universities', () => ({
  useUniversitiesControllerFindAll: () => ({
    data: [{ id: 'u-kmutt', name: 'KMUTT University', shortName: 'KMUTT' }],
  }),
}))
vi.mock('@/src/lib/api/generated/users/users', () => ({
  useUsersControllerUpdateMe: () => ({ mutateAsync: mocks.updateMe }),
  useUsersControllerUpdateAcademicProfile: () => ({ mutateAsync: mocks.updateAcademic }),
  getUsersControllerGetMeQueryKey: () => ['me'],
}))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError } }))

const { EditProfileForm } = await import('./edit-profile-form')

beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.scrollIntoView = () => {}
})
beforeEach(() => {
  vi.clearAllMocks()
  mocks.updateMe.mockResolvedValue({})
  mocks.updateAcademic.mockResolvedValue({})
})
afterEach(cleanup)

const baseUser = {
  id: 'u1',
  name: 'Student',
  email: 's@example.com',
  emailVerified: true,
  role: 'USER',
  bio: null,
  university: { id: 'u-kmutt', name: 'KMUTT University', shortName: 'KMUTT' },
  department: null,
  enrollmentYear: 2024,
  shouldShowUpdateMajorPopup: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  postCount: 0,
  commentCount: 0,
  savedCount: 0,
  followerCount: 0,
} as unknown as UserProfileEntity

function renderForm(user: UserProfileEntity) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <EditProfileForm user={user} />
    </QueryClientProvider>,
  )
}

/** The university select is disabled; the department select is the enabled combobox. */
const departmentSelect = () =>
  screen.getAllByRole('combobox').find((el) => !el.hasAttribute('disabled'))!

describe('EditProfileForm department picker', () => {
  it('groups departments by faculty and sends a newly picked one', async () => {
    renderForm(baseUser)
    await userEvent.click(departmentSelect())

    const listbox = await screen.findByRole('listbox')
    const groups = within(listbox).getAllByRole('group')
    expect(groups.map((g) => g.firstChild?.textContent)).toEqual([
      'Faculty of Engineering',
      'Faculty of Science',
    ])
    await userEvent.click(within(listbox).getByRole('option', { name: 'Physics' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.updateAcademic).toHaveBeenCalled())
    expect(mocks.updateAcademic.mock.calls[0][0].data).toEqual({
      departmentId: 'd-phys',
      enrollmentYear: 2024,
    })
  })

  it('does not send back an untouched department outside the scoped list', async () => {
    renderForm({
      ...baseUser,
      department: { id: 'd-stale', name: 'Old Major', code: 'OLD' },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.updateAcademic).toHaveBeenCalled())
    const data = mocks.updateAcademic.mock.calls[0][0].data
    expect(data).not.toHaveProperty('departmentId')
    expect(data).not.toHaveProperty('universityId')
    expect(await screen.findByText('Profile saved successfully')).toBeInTheDocument()
  })

  it('shows the API message in a toast when saving fails', async () => {
    mocks.updateAcademic.mockRejectedValue(new Error('Department is not in your university'))
    renderForm(baseUser)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith('Department is not in your university'),
    )
    expect(screen.queryByText('Profile saved successfully')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })
})
