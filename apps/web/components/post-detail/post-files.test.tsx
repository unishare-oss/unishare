import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PostFiles } from '@/components/post-detail/post-files'

vi.mock('@/src/lib/api/generated/files/files', () => ({
  filesControllerGetDownloadUrl: vi.fn(),
  filesControllerRecordDownload: vi.fn(),
}))
vi.mock('@/components/shared/pdf-viewer/pdf-viewer', () => ({ PdfViewer: () => null }))

const post = (description: string) =>
  ({ id: 'p1', description, externalUrl: null, files: [] }) as unknown as Parameters<
    typeof PostFiles
  >[0]['post']

describe('PostFiles description', () => {
  it('turns bare URLs into links', () => {
    render(<PostFiles post={post('See https://example.com/a?b=1 for more.')} />)
    expect(screen.getByRole('link', { name: 'https://example.com/a?b=1' })).toHaveAttribute(
      'href',
      'https://example.com/a?b=1',
    )
  })

  it('keeps existing markdown links intact', () => {
    render(<PostFiles post={post('Read [the docs](https://example.com/docs) first.')} />)
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'the docs' })).toHaveAttribute(
      'href',
      'https://example.com/docs',
    )
  })

  it('styles markdown headings like the demo paper headings', () => {
    render(<PostFiles post={post('## Collisions')} />)
    const heading = screen.getByRole('heading', { name: 'Collisions' })
    expect(heading.parentElement?.className).toContain('text-ink')
  })
})

describe('PostFiles attachments', () => {
  it('hides the attachments block when there are no files', () => {
    render(<PostFiles post={post('desc')} />)
    expect(screen.queryByText('Attachments')).not.toBeInTheDocument()
  })

  it('lists attachments when there are files', () => {
    const withFile = {
      ...post('desc'),
      files: [{ id: 'f1', name: 'a.pdf', mimeType: 'application/pdf', size: 10, downloads: 0 }],
    } as unknown as Parameters<typeof PostFiles>[0]['post']
    render(<PostFiles post={withFile} />)
    expect(screen.getByText('Attachments')).toBeInTheDocument()
  })
})
