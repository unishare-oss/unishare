import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  options: undefined as undefined | { mutation: { onSuccess: () => void; onError: () => void } },
}))
vi.mock('@/src/lib/api/generated/universities/universities', () => ({
  useUniversitiesControllerFindAll: () => ({
    data: [
      { id: 'u1', name: 'Mae Fah Luang University', shortName: 'MFU' },
      { id: 'u2', name: 'Chiang Mai University', shortName: 'CMU' },
    ],
    isLoading: false,
  }),
}))
vi.mock('@/src/lib/api/generated/users/users', () => ({
  getUsersControllerGetMeQueryKey: () => ['/api/users/me'],
  useUsersControllerSetGuestUniversity: (options: typeof mocks.options) => {
    mocks.options = options
    return { mutate: mocks.mutate, isPending: false, variables: undefined }
  },
}))
const toastError = vi.fn()
vi.mock('sonner', () => ({ toast: { error: (m: string) => toastError(m) } }))

const { GuestUniversityPicker } = await import('./guest-university-picker')

describe('GuestUniversityPicker', () => {
  let queryClient: QueryClient
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient()
  })
  const renderPicker = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <GuestUniversityPicker />
      </QueryClientProvider>,
    )

  it('lists the universities and saves the one the guest picks', async () => {
    renderPicker()
    await userEvent.click(screen.getByRole('button', { name: 'Chiang Mai University (CMU)' }))
    expect(mocks.mutate).toHaveBeenCalledWith({ data: { universityId: 'u2' } })
  })

  it('reloads the profile once picked, so the shell shows that university', () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    renderPicker()
    mocks.options!.mutation.onSuccess()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['/api/users/me'] })
  })

  it('tells the guest when picking failed', () => {
    renderPicker()
    mocks.options!.mutation.onError()
    expect(toastError).toHaveBeenCalled()
  })
})
