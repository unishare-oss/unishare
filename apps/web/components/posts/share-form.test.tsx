import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ShareForm } from './share-form'

Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

const { warning } = vi.hoisted(() => ({ warning: vi.fn() }))
const push = vi.fn()
const create = vi.fn()
const confirmUpload = vi.fn()
const suggestCourses = vi.fn()
const mutateSuggestCourses = ({ data }: { data: unknown }) => suggestCourses(data)

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: { name: 'Mya T.', yearLevel: 2, department: { id: 'd1' } } }),
}))
vi.mock('@/components/TagInput', () => ({ TagInput: () => <div /> }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), warning } }))

const loaded = {
  items: [
    { id: 'c1', code: 'CSC213', name: 'Data Structures', yearLevel: 2 },
    { id: 'c2', code: 'MTH101', name: 'Calculus', yearLevel: 1 },
  ],
}
const notLoaded = { items: [] }
let coursesData = loaded

vi.mock('@/src/lib/api/generated/courses/courses', () => ({
  useCoursesControllerFindAll: () => ({ isLoading: false, data: coursesData }),
  useCoursesControllerSuggest: () => ({
    mutateAsync: mutateSuggestCourses,
  }),
}))
vi.mock('@/src/lib/api/generated/posts/posts', () => ({
  usePostsControllerCreate: () => ({ mutateAsync: create }),
}))
vi.mock('@/src/lib/api/generated/files/files', () => ({
  filesControllerConfirmUpload: (...args: unknown[]) => confirmUpload(...args),
}))
vi.mock('@/lib/posts/upload-post-file', () => ({
  COURSE_MATCH_SUPPORTED_MIME_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  getUploadMimeType: (file: File) => file.type,
  uploadPostFile: vi.fn(async (file: File) => ({
    key: 'k',
    name: file.name,
    size: file.size,
    mimeType: file.type,
  })),
}))

function pdf(name: string) {
  return new File(['x'], name, { type: 'application/pdf' })
}

async function chooseFile(name: string) {
  await userEvent.upload(screen.getByLabelText('Files to share', { selector: 'input' }), pdf(name))
}

beforeEach(() => {
  vi.clearAllMocks()
  coursesData = loaded
  create.mockResolvedValue({ data: { id: 'p1' } })
  suggestCourses.mockResolvedValue({
    data: { suggestions: [{ id: 'c2', code: 'MTH101', name: 'Calculus' }], available: true },
  })
})

describe('ShareForm', () => {
  it('uploads a complete file set before matching and lets the student choose a suggestion', async () => {
    render(<ShareForm />)
    await chooseFile('notes.pdf')
    await waitFor(() => expect(suggestCourses).toHaveBeenCalledTimes(1))

    const input = screen.getByLabelText('Files to share', { selector: 'input' })
    await userEvent.upload(input, pdf('slides.docx'))
    await waitFor(() => expect(suggestCourses).toHaveBeenCalledTimes(2))
    expect(suggestCourses.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        departmentId: 'd1',
        files: [
          expect.objectContaining({ key: 'k', mimeType: 'application/pdf' }),
          expect.objectContaining({ key: 'k', mimeType: 'application/pdf' }),
        ],
      }),
    )

    await userEvent.click(await screen.findByRole('button', { name: /suggested.*MTH101/i }))
    expect(screen.getByRole('button', { name: /^MTH101 / })).toHaveAttribute('aria-pressed', 'true')
    const suggestion = screen.getByRole('button', { name: 'Suggested course MTH101 Calculus' })
    const regularCourse = screen.getByRole('button', { name: /^MTH101 / })
    expect(
      suggestion.compareDocumentPosition(regularCourse) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(create).not.toHaveBeenCalled()
  })

  it('sends only the first five supported attachments for matching', async () => {
    render(<ShareForm />)
    const files = Array.from({ length: 11 }, (_, index) => pdf(`notes-${index}.pdf`))
    await userEvent.upload(screen.getByLabelText('Files to share', { selector: 'input' }), files)

    await waitFor(() => expect(suggestCourses).toHaveBeenCalledTimes(1))
    expect(suggestCourses.mock.calls[0]?.[0].files).toHaveLength(5)
  })

  it('matches supported files when an unrelated attachment upload fails', async () => {
    const { uploadPostFile } = await import('@/lib/posts/upload-post-file')
    vi.mocked(uploadPostFile).mockImplementation(async (file: File) => {
      if (file.type === 'image/png') throw new Error('image upload failed')
      return { key: 'pdf-key', name: file.name, size: file.size, mimeType: file.type }
    })
    render(<ShareForm />)
    await chooseFile('CSC213_Module4_Heaps.pdf')
    await waitFor(() => expect(suggestCourses).toHaveBeenCalledTimes(1))
    await userEvent.upload(
      screen.getByLabelText('Files to share', { selector: 'input' }),
      new File(['image'], 'diagram.png', { type: 'image/png' }),
    )

    await waitFor(() => expect(suggestCourses).toHaveBeenCalledTimes(2))
    expect(uploadPostFile).toHaveBeenCalledTimes(1)
    expect(suggestCourses.mock.calls[1]?.[0].files).toEqual([
      { key: 'pdf-key', mimeType: 'application/pdf' },
    ])
    await userEvent.click(screen.getByRole('button', { name: 'Share' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/posts/p1'))
    expect(uploadPostFile).toHaveBeenCalledTimes(2)
    expect(screen.queryByText(/Suggestions aren.t available/)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Suggested course MTH101 Calculus' }),
    ).toBeInTheDocument()
  })

  it('ignores a suggestion response for an older attachment set', async () => {
    let resolveOld!: (value: {
      data: { available: boolean; suggestions: Array<{ id: string; code: string; name: string }> }
    }) => void
    suggestCourses.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve
        }),
    )
    suggestCourses.mockResolvedValueOnce({
      data: {
        available: true,
        suggestions: [{ id: 'c1', code: 'CSC213', name: 'Data Structures' }],
      },
    })
    render(<ShareForm />)
    await chooseFile('notes.pdf')
    await waitFor(() => expect(suggestCourses).toHaveBeenCalledTimes(1))

    await userEvent.upload(
      screen.getByLabelText('Files to share', { selector: 'input' }),
      pdf('slides.pdf'),
    )
    await waitFor(() => expect(suggestCourses).toHaveBeenCalledTimes(2))
    await act(async () => {
      resolveOld({
        data: { available: true, suggestions: [{ id: 'c2', code: 'MTH101', name: 'Calculus' }] },
      })
    })

    expect(
      screen.queryByRole('button', { name: 'Suggested course MTH101 Calculus' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Suggested course CSC213 Data Structures' }),
    ).toBeInTheDocument()
  })

  it('submits one page and creates the post', async () => {
    const { uploadPostFile } = await import('@/lib/posts/upload-post-file')
    render(<ShareForm />)
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument()
    await chooseFile('IMG_2041.pdf')
    await userEvent.click(screen.getByRole('button', { name: /^CSC213 / }))
    await userEvent.click(screen.getByRole('combobox', { name: /module/i }))
    await userEvent.click(await screen.findByRole('option', { name: 'Module 4' }))
    await userEvent.click(screen.getByLabelText(/title/i))
    await userEvent.paste('Lecture notes')
    await userEvent.click(screen.getByRole('button', { name: 'Share' }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/posts/p1'))
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        courseId: 'c1',
        moduleNumber: 4,
        year: 2,
        semester: expect.any(Number),
        description: '',
        title: 'Lecture notes',
      }),
    })
    expect(confirmUpload).toHaveBeenCalled()
    expect(confirmUpload).toHaveBeenCalledWith('p1', expect.objectContaining({ preShare: true }))
    expect(uploadPostFile).toHaveBeenCalledTimes(1)
  })

  it('keeps manual selection and sharing available when matching fails', async () => {
    suggestCourses.mockRejectedValueOnce(new Error('offline'))
    render(<ShareForm />)
    await chooseFile('notes.pdf')
    expect(await screen.findByText(/Suggestions aren.t available/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^CSC213 / })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    await userEvent.click(screen.getByRole('button', { name: /^CSC213 / }))
    await userEvent.click(screen.getByRole('combobox', { name: /module/i }))
    await userEvent.click(await screen.findByRole('option', { name: 'Module 4' }))
    await userEvent.click(screen.getByLabelText(/title/i))
    await userEvent.paste('Lecture notes')
    await userEvent.click(screen.getByRole('button', { name: 'Share' }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/posts/p1'))
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ courseId: 'c1' }) })
  })

  it('keeps Share disabled and lists what is missing', async () => {
    render(<ShareForm />)
    await chooseFile('IMG_2041.pdf')
    expect(screen.getByRole('button', { name: 'Share' })).toBeDisabled()
    expect(screen.getByText(/Still needed: a course, a module and a title/)).toBeInTheDocument()
  })

  it('choosing a file pre-fills fields', async () => {
    render(<ShareForm />)
    await chooseFile('CSC213_Module10_Heaps.pdf')
    expect(screen.getByRole('button', { name: /^CSC213 / })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText(/title/i)).toHaveValue('Module 10 Heaps')
    expect(screen.getByRole('combobox', { name: /module/i })).toHaveTextContent('Module 10')
    expect(screen.getAllByText('from the file name').length).toBeGreaterThanOrEqual(3)
  })

  it('uses the module dropdown', async () => {
    render(<ShareForm />)
    await chooseFile('notes.pdf')
    expect(screen.getByRole('combobox', { name: /module/i })).toBeInTheDocument()
    expect(screen.queryByRole('spinbutton', { name: /module/i })).not.toBeInTheDocument()
  })

  it('pre-selects the course from the course page', async () => {
    const { unmount } = render(<ShareForm initialCourseId="c2" />)
    await chooseFile('notes.pdf')
    expect(screen.getByRole('button', { name: /^MTH101 / })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^CSC213 / })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    unmount()

    render(<ShareForm initialCourseId="nope" />)
    await chooseFile('notes.pdf')
    for (const chip of screen.getAllByRole('button', { name: /^(CSC213|MTH101) / })) {
      expect(chip).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('shows Old exam locked and says so when pressed', async () => {
    render(<ShareForm />)
    await chooseFile('notes.pdf')
    const oldExam = screen.getByRole('button', { name: 'Old exam' })
    expect(oldExam).toHaveAttribute('aria-disabled', 'true')
    expect(oldExam).toHaveAttribute('title', 'Old exams are locked for now.')
    expect(screen.queryByText('Old exams are locked for now.')).not.toBeInTheDocument()
    await userEvent.hover(oldExam)
    expect(screen.queryByText('Old exams are locked for now.')).not.toBeInTheDocument()
    await userEvent.click(oldExam)
    expect(screen.getByText('Old exams are locked for now.')).toBeInTheDocument()
    expect(oldExam).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Note' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps an exam-like file name as a Note with no exam year', async () => {
    render(<ShareForm />)
    await chooseFile('MTH101 Midterm 2024.pdf')
    expect(screen.getByRole('button', { name: 'Note' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText(/exam year/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '2024' })).not.toBeInTheDocument()
    // Only the course and the title were filled in.
    expect(screen.getByText(/We filled in 2 things/)).toBeInTheDocument()
  })

  it('never submits an old exam', async () => {
    render(<ShareForm />)
    await chooseFile('CSC213_Module4_Final Exam.pdf')
    await userEvent.click(screen.getByRole('button', { name: 'Old exam' }))
    await userEvent.click(screen.getByRole('button', { name: 'Share' }))
    await waitFor(() => expect(create).toHaveBeenCalled())
    const { data } = create.mock.calls[0]![0]
    expect(data.type).toBe('NOTE')
    expect(data).not.toHaveProperty('examYear')
  })

  it('shows the title error on blur', async () => {
    render(<ShareForm />)
    await chooseFile('IMG_2041.pdf')
    const title = screen.getByLabelText(/title/i)
    await userEvent.click(title)
    await userEvent.paste('ab')
    await userEvent.tab()
    expect(screen.getByText('Give it a title of at least 3 letters.')).toBeInTheDocument()
    expect(title).toHaveAttribute('aria-invalid', 'true')
  })

  it('hides the course search until Other course is chosen', async () => {
    render(<ShareForm />)
    await chooseFile('IMG_2041.pdf')
    expect(screen.queryByRole('textbox', { name: /find a course/i })).not.toBeInTheDocument()
    const other = screen.getByRole('button', { name: /other course/i })
    expect(other).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(other)
    expect(other).toHaveAttribute('aria-expanded', 'true')
    await userEvent.type(screen.getByRole('textbox', { name: /find a course/i }), 'calc')
    await userEvent.click(screen.getByRole('button', { name: /^MTH101 / }))
    expect(screen.queryByRole('textbox', { name: /find a course/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^MTH101 / })).toHaveAttribute('aria-pressed', 'true')
  })

  it('guesses the course again when the courses load after the file', async () => {
    coursesData = notLoaded
    const { rerender } = render(<ShareForm />)
    await chooseFile('CSC213_Module3.pdf')
    coursesData = loaded
    rerender(<ShareForm />)
    expect(await screen.findByRole('button', { name: /^CSC213 / })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('retries a failed suggestion upload when Share is clicked', async () => {
    const { uploadPostFile } = await import('@/lib/posts/upload-post-file')
    vi.mocked(uploadPostFile).mockRejectedValueOnce(new Error('network'))
    vi.mocked(uploadPostFile).mockResolvedValueOnce({
      key: 'k-retried',
      name: 'CSC213_Module4_Heaps.pdf',
      size: 1,
      mimeType: 'application/pdf',
    })
    render(<ShareForm />)
    await chooseFile('CSC213_Module4_Heaps.pdf')
    await userEvent.click(screen.getByRole('button', { name: 'Share' }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/posts/p1'))
    expect(create).toHaveBeenCalledTimes(1)
    expect(uploadPostFile).toHaveBeenCalledTimes(2)
    expect(confirmUpload).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ key: 'k-retried', preShare: true }),
    )
    expect(warning).not.toHaveBeenCalled()
  })

  it('shows the partial-failure toast when an upload fails on both attempts', async () => {
    const { uploadPostFile } = await import('@/lib/posts/upload-post-file')
    vi.mocked(uploadPostFile).mockRejectedValue(new Error('network'))
    render(<ShareForm />)
    await chooseFile('CSC213_Module4_Heaps.pdf')
    await userEvent.click(screen.getByRole('button', { name: 'Share' }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/posts/p1'))
    expect(uploadPostFile).toHaveBeenCalledTimes(2)
    expect(warning).toHaveBeenCalledWith("Shared. 1 file didn't upload. Add them from Edit.")
  })
})
