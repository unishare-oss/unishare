import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PostAiChat } from '@/components/post-detail/post-ai-chat'
import type { PostDetailEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

type IndexStatus = {
  state: 'unsupported' | 'preparing' | 'ready' | 'failed'
  indexedChunks: number
  supportedFiles: number
  readyFiles: number
}

const mocks = vi.hoisted(() => ({
  status: undefined as IndexStatus | undefined,
  sendMessage: vi.fn(),
}))

vi.mock('@/hooks/use-ai-index-status', () => ({
  useAiIndexStatus: () => ({ status: mocks.status, isLoading: false }),
}))

vi.mock('@/hooks/use-post-ai-chat', () => ({
  usePostAiChat: () => ({
    messages: [],
    sendMessage: mocks.sendMessage,
    isPending: false,
    reset: vi.fn(),
  }),
}))

const PDF = 'application/pdf'

/** Only enough of the entity to get past `hasSupportedFiles`. */
function makePost(mimeType = PDF): PostDetailEntity {
  return { id: 'post-1', files: [{ id: 'f1', mimeType }] } as unknown as PostDetailEntity
}

function givenStatus(state: IndexStatus['state'], indexedChunks = 0): void {
  mocks.status = { state, indexedChunks, supportedFiles: 1, readyFiles: 0 }
}

/** The notice lives inside the collapsible, so the panel has to be opened to see it. */
async function renderOpened(post = makePost()) {
  const user = userEvent.setup()
  render(<PostAiChat post={post} />)
  const trigger = screen.queryByRole('button', { name: /ask ai/i })
  if (trigger) await user.click(trigger)
  return user
}

describe('PostAiChat indexing notice', () => {
  beforeEach(() => {
    mocks.status = undefined
    mocks.sendMessage.mockReset()
  })

  it('shows the preparing notice with the live chunk count', async () => {
    givenStatus('preparing', 32)
    await renderOpened()

    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent(/Preparing this document for AI chat/i)
    expect(notice).toHaveTextContent(/indexed 32 sections so far/i)
  })

  it('keeps the chat input enabled while preparing, because the fallback works', async () => {
    givenStatus('preparing', 5)
    await renderOpened()

    // The notice sets expectations; it must never block use.
    expect(screen.getByPlaceholderText(/ask about this document/i)).toBeEnabled()
  })

  it('renders no notice once indexing is ready', async () => {
    givenStatus('ready', 40)
    await renderOpened()

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText(/Preparing this document/i)).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText(/ask about this document/i)).toBeEnabled()
  })

  it('renders no notice when the server reports unsupported', async () => {
    // The embeddings-disabled path. The post still has a PDF, so the panel renders -- but a
    // permanent "Preparing…" here was the original bug, since nothing would ever move it off.
    givenStatus('unsupported')
    await renderOpened()

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText(/Preparing this document/i)).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText(/ask about this document/i)).toBeEnabled()
  })

  it('says so plainly when indexing failed, without disabling the input', async () => {
    givenStatus('failed')
    await renderOpened()

    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent(/couldn't be prepared for AI chat/i)
    expect(notice).toHaveTextContent(/won't cite page numbers/i)
    expect(screen.getByPlaceholderText(/ask about this document/i)).toBeEnabled()
  })

  it('renders nothing at all for a post with no indexable files', async () => {
    givenStatus('unsupported')
    const { container } = render(<PostAiChat post={makePost('image/png')} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('never shows a percentage or a progress bar', async () => {
    // The total chunk count is unknowable until chunking finishes, so any ratio would be
    // invented. Guards against a well-meaning future "improvement".
    givenStatus('preparing', 32)
    await renderOpened()

    expect(screen.getByRole('status')).not.toHaveTextContent('%')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})
