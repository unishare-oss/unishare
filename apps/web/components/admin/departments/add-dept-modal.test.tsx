import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({ facultiesParams: vi.fn() }))

vi.mock('@/src/lib/api/generated/universities/universities', () => ({
  useUniversitiesControllerFindAll: () => ({
    data: [
      { id: 'u-kmutt', name: 'KMUTT University', shortName: 'KMUTT' },
      { id: 'u-mfu', name: 'Mae Fah Luang University', shortName: 'MFU' },
    ],
  }),
}))
vi.mock('@/src/lib/api/generated/faculties/faculties', () => ({
  useFacultiesControllerFindAll: (params: { universityId: string }) => {
    mocks.facultiesParams(params)
    const faculties = [
      { id: 'f-eng', name: 'Faculty of Engineering', universityId: 'u-kmutt' },
      { id: 'f-it', name: 'School of Information Technology', universityId: 'u-mfu' },
    ]
    return { data: faculties.filter((f) => f.universityId === params.universityId) }
  },
}))

const { AddDeptModal } = await import('./add-dept-modal')

beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

describe('AddDeptModal', () => {
  it('requires a faculty and does not create without one', async () => {
    const onSubmit = vi.fn()
    render(<AddDeptModal open onClose={vi.fn()} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('Name'), 'Robotics')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText('Pick a faculty')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('creates with the picked faculty', async () => {
    const onSubmit = vi.fn()
    const onClose = vi.fn()
    render(<AddDeptModal open onClose={onClose} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('Name'), 'Robotics')
    await userEvent.click(screen.getByRole('combobox', { name: 'University' }))
    await userEvent.click(await screen.findByRole('option', { name: /KMUTT University/ }))
    expect(mocks.facultiesParams).toHaveBeenLastCalledWith({ universityId: 'u-kmutt' })
    await userEvent.click(screen.getByRole('combobox', { name: 'Faculty' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Faculty of Engineering' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ name: 'Robotics', facultyId: 'f-eng' }),
    )
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('stays open when the save fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Department already exists'))
    const onClose = vi.fn()
    render(<AddDeptModal open onClose={onClose} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('Name'), 'Robotics')
    await userEvent.click(screen.getByRole('combobox', { name: 'University' }))
    await userEvent.click(await screen.findByRole('option', { name: /KMUTT University/ }))
    await userEvent.click(screen.getByRole('combobox', { name: 'Faculty' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Faculty of Engineering' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    // Enabled again once the rejected save has settled
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled())
    expect(onClose).not.toHaveBeenCalled()
  })

  it('resets the faculty when the university changes', async () => {
    const onSubmit = vi.fn()
    render(<AddDeptModal open onClose={vi.fn()} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('Name'), 'Robotics')
    await userEvent.click(screen.getByRole('combobox', { name: 'University' }))
    await userEvent.click(await screen.findByRole('option', { name: /KMUTT University/ }))
    await userEvent.click(screen.getByRole('combobox', { name: 'Faculty' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Faculty of Engineering' }))
    expect(screen.getByRole('combobox', { name: 'Faculty' })).toHaveTextContent(
      'Faculty of Engineering',
    )

    await userEvent.click(screen.getByRole('combobox', { name: 'University' }))
    await userEvent.click(await screen.findByRole('option', { name: /Mae Fah Luang/ }))

    expect(mocks.facultiesParams).toHaveBeenLastCalledWith({ universityId: 'u-mfu' })
    expect(screen.getByRole('combobox', { name: 'Faculty' })).toHaveTextContent('Select a faculty')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(await screen.findByText('Pick a faculty')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('combobox', { name: 'Faculty' }))
    expect((await screen.findAllByRole('option')).map((o) => o.textContent)).toEqual([
      'School of Information Technology',
    ])
  })

  it('prefills the faculty when editing', () => {
    render(
      <AddDeptModal
        open
        dept={{
          id: 'd1',
          name: 'Computer Engineering',
          courseCount: 0,
          faculty: { id: 'f-eng', name: 'Faculty of Engineering', universityId: 'u-kmutt' },
        }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Name')).toHaveValue('Computer Engineering')
    expect(screen.getByRole('combobox', { name: 'Faculty' })).toHaveTextContent(
      'Faculty of Engineering',
    )
  })
})
