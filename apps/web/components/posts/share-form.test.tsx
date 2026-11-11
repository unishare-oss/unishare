import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  params: new URLSearchParams(),
  createPost: vi.fn(),
  confirmUpload: vi.fn(),
  toastSuccess: vi.fn(),
  removePost: vi.fn(),
  upload: vi.fn(),
  auth: { isLoading: false },
  coursesLoading: false,
  courses: [
    { id: 'c1', code: 'CSC213', name: 'Data Structures', yearLevel: 2 },
    { id: 'c2', code: 'MTH101', name: 'Calculus', yearLevel: 1 },
  ],
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => mocks.params,
}))
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: mocks.toastSuccess, error: vi.fn() }),
}))
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { name: 'Mali', yearLevel: 2, department: { id: 'd1' } },
    isLoading: mocks.auth.isLoading,
  }),
}))
vi.mock('@/src/lib/api/generated/courses/courses', () => ({
  useCoursesControllerFindAll: () => ({
    data: { items: mocks.courses },
    isLoading: mocks.coursesLoading,
  }),
}))
vi.mock('@/src/lib/api/generated/posts/posts', () => ({
  usePostsControllerCreate: () => ({ mutateAsync: mocks.createPost }),
  usePostsControllerFindAll: () => ({ data: { items: [] } }),
  postsControllerRemove: mocks.removePost,
}))
vi.mock('@/src/lib/api/generated/files/files', () => ({
  filesControllerConfirmUpload: mocks.confirmUpload,
}))
vi.mock('@/lib/posts/upload-post-file', () => ({
  uploadPostFile: (file: File) => mocks.upload(file),
}))
vi.mock('@/components/TagInput', () => ({ TagInput: () => null }))
vi.mock('@/lib/store', () => ({ useUploadStore: () => vi.fn() }))

const { ShareForm } = await import('./share-form')

function addFile(name: string) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['x'], name, { type: 'application/pdf' })
  fireEvent.change(input, { target: { files: [file] } })
}

describe('ShareForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth = { isLoading: false }
    mocks.coursesLoading = false
    mocks.upload.mockImplementation(async (file: File) => ({
      key: 'k',
      name: file.name,
      size: file.size,
      mimeType: file.type,
    }))
    mocks.removePost.mockResolvedValue(undefined)
    mocks.params = new URLSearchParams()
    mocks.createPost.mockResolvedValue({ data: { id: 'p1' } })
  })

  it('shows only the drop box until a file is added', () => {
    render(<ShareForm />)
    expect(screen.getByText('Drop your file here')).toBeInTheDocument()
    expect(screen.queryByText('What is it?')).not.toBeInTheDocument()
    addFile('notes.pdf')
    expect(screen.getByText('What is it?')).toBeInTheDocument()
  })

  it('marks guessed fields, counts them, and drops the mark when the student edits', async () => {
    render(<ShareForm />)
    addFile('CSC213_Module2_heaps.pdf')
    await waitFor(() => expect(screen.getAllByText('from the file name')).toHaveLength(3))
    expect(screen.getByText(/We filled in 3 things from/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: 'My own title' } })
    expect(screen.getAllByText('from the file name')).toHaveLength(2)
  })

  it('says so when nothing could be guessed', async () => {
    render(<ShareForm />)
    addFile('IMG_2041.pdf')
    await waitFor(() => expect(screen.getByText(/We couldn’t tell much from/)).toBeInTheDocument())
  })

  it('keeps Share disabled with what is still needed as fields are filled', async () => {
    render(<ShareForm />)
    addFile('IMG_2041.pdf')
    expect(await screen.findByText('Still needed: course, a module, title')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: 'Heaps' } })
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Post anonymously' }))
    expect(screen.getByRole('status')).toHaveTextContent('Still needed: course')
  })

  it('picks the course from ?courseId=', async () => {
    mocks.params = new URLSearchParams('courseId=c2')
    render(<ShareForm />)
    addFile('IMG_2041.pdf')
    expect(await screen.findByText('from the course page')).toBeInTheDocument()
  })

  it('shares, opens the new post and shows the toast with Undo', async () => {
    render(<ShareForm />)
    addFile('CSC213_Module2_heaps.pdf')
    const share = await screen.findByRole('button', { name: 'Share' })
    await waitFor(() => expect(share).toBeEnabled())
    expect(screen.getByRole('status')).toHaveTextContent('Shares to CSC213 · Module 2')

    fireEvent.click(screen.getByRole('switch', { name: 'Post anonymously' }))
    expect(screen.getByRole('status')).toHaveTextContent(
      'Shares to CSC213 · Module 2 · anonymously',
    )

    fireEvent.click(share)
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/posts/p1'))
    expect(mocks.createPost).toHaveBeenCalledWith({
      data: expect.objectContaining({ courseId: 'c1', moduleNumber: 2, isAnonymous: true }),
    })
    expect(mocks.confirmUpload).toHaveBeenCalledWith('p1', expect.objectContaining({ key: 'k' }))
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      'Shared to CSC213. Classmates can see it now.',
      expect.objectContaining({ action: expect.objectContaining({ label: 'Undo' }) }),
    )

    const options = mocks.toastSuccess.mock.calls[0]![1] as { action: { onClick: () => void } }
    options.action.onClick()
    await waitFor(() => expect(mocks.removePost).toHaveBeenCalledWith('p1'))
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/posts/new?courseId=c1'))
  })

  it('goes back to Note when the last file is removed and a new one is added', async () => {
    render(<ShareForm />)
    addFile('pset1.pdf')
    expect(await screen.findByRole('button', { name: 'Exercise' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove pset1.pdf' }))
    expect(screen.queryByText('What is it?')).not.toBeInTheDocument()

    addFile('lecture.pdf')
    expect(await screen.findByRole('button', { name: 'Note' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('keeps the course from ?courseId= after the last file is removed', async () => {
    mocks.params = new URLSearchParams('courseId=c2')
    render(<ShareForm />)
    addFile('IMG_1.pdf')
    expect(await screen.findByText('from the course page')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove IMG_1.pdf' }))
    addFile('IMG_2.pdf')
    expect(await screen.findByText('from the course page')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Course/)).toHaveValue('MTH101 — Calculus')
  })

  it('says what is wrong with the link instead of the ready line, and opens More details', async () => {
    render(<ShareForm />)
    addFile('CSC213_Module2_heaps.pdf')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Shares to CSC213'))
    fireEvent.change(screen.getByLabelText('Link'), { target: { value: 'http://example.com' } })
    expect(screen.getByRole('status')).toHaveTextContent('Fix the link in More details')
    expect(screen.getByRole('button', { name: 'Share' })).toBeDisabled()
    expect(document.querySelector('details')).toHaveProperty('open', true)
  })

  it('waits for the user and courses before guessing the course', async () => {
    mocks.auth = { isLoading: true }
    mocks.coursesLoading = true
    const { rerender } = render(<ShareForm />)
    addFile('CSC213_Module2_heaps.pdf')
    expect(screen.queryByText(/We filled in/)).not.toBeInTheDocument()

    mocks.auth = { isLoading: false }
    mocks.coursesLoading = false
    rerender(<ShareForm />)
    await waitFor(() => expect(screen.getByText(/We filled in 3 things/)).toBeInTheDocument())
    expect(screen.getByLabelText(/^Course/)).toHaveValue('CSC213 — Data Structures')
  })

  it('shows the preview and good-to-know in the page rail', async () => {
    render(<ShareForm />)
    addFile('CSC213_Module2_heaps.pdf')
    const rail = await screen.findByRole('complementary', { name: 'Page details' })
    expect(within(rail).getByText('How classmates will see it')).toBeInTheDocument()
    expect(within(rail).getByText('Good to know')).toBeInTheDocument()
    expect(within(rail).getByText(/· Module 2/)).toBeInTheDocument()
  })

  it('counts a file that is still uploading in the preview card', async () => {
    mocks.upload.mockReturnValue(new Promise(() => {}))
    render(<ShareForm />)
    addFile('notes.pdf')
    expect(await screen.findByText('1 file')).toBeInTheDocument()
    expect(screen.queryByText('0 files')).not.toBeInTheDocument()
  })
})
