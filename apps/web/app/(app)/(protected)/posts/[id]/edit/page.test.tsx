import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

const updatePost = vi.hoisted(() => vi.fn())

const post = {
  id: 'p1',
  type: 'NOTE',
  title: 'Heaps',
  description: null,
  isOwner: true,
  isAnonymous: false,
  year: 2,
  semester: 1,
  moduleNumber: 4,
  examYear: null,
  externalUrl: null,
  tags: [],
  files: [],
  course: { id: 'c1', code: 'CSC213', name: 'Data Structures', department: { id: 'd1' } },
}

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))
vi.mock('@/components/shared/page-header', () => ({ PageHeader: () => null }))
vi.mock('@/components/posts/files-step', () => ({ FilesStep: () => null }))
vi.mock('@/components/TagInput', () => ({ TagInput: () => <div /> }))
vi.mock('@/src/lib/api/generated/posts/posts', () => ({
  usePostsControllerFindOne: () => ({ data: post, isLoading: false }),
  usePostsControllerUpdate: () => ({ mutateAsync: updatePost, isPending: false }),
}))
vi.mock('@/src/lib/api/generated/files/files', () => ({
  useFilesControllerConfirmUpload: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useFilesControllerRemove: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

const { default: EditPostPage } = await import('./page')

// A settled promise, so `use(params)` reads it without suspending.
const params = Object.assign(Promise.resolve({ id: 'p1' }), {
  status: 'fulfilled',
  value: { id: 'p1' },
})

describe('edit post page', () => {
  it('lets a post shared without a description be saved', async () => {
    render(<EditPostPage params={params} />)
    const title = await screen.findByLabelText(/title/i)
    await userEvent.type(title, '!')
    const save = screen.getByRole('button', { name: 'Save changes' })
    expect(save).toBeEnabled()
    await userEvent.click(save)
    expect(updatePost).toHaveBeenCalledWith({
      id: 'p1',
      data: expect.objectContaining({ title: 'Heaps!', description: '' }),
    })
  })
})
