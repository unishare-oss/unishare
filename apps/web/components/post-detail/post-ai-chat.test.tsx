import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PostAiChat } from '@/components/post-detail/post-ai-chat'
import type { ChatMessage } from '@/hooks/use-post-ai-chat'
import type { PostDetailEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

type IndexStatus = {
  state: 'unsupported' | 'preparing' | 'ready' | 'failed'
  indexedChunks: number
  supportedFiles: number
  readyFiles: number
}

const mocks = vi.hoisted(() => ({
  status: undefined as IndexStatus | undefined,
  messages: [] as ChatMessage[],
  sendMessage: vi.fn(),
}))

vi.mock('@/hooks/use-ai-index-status', () => ({
  useAiIndexStatus: () => ({ status: mocks.status, isLoading: false }),
}))

vi.mock('@/hooks/use-post-ai-chat', () => ({
  usePostAiChat: () => ({
    messages: mocks.messages,
    sendMessage: mocks.sendMessage,
    isPending: false,
    reset: vi.fn(),
  }),
}))

const PDF = 'application/pdf'

/** Only enough of the entity to get past `hasSupportedFiles`. Accepts one mime type or many. */
function makePost(mimeTypes: string | string[] = PDF): PostDetailEntity {
  const list = Array.isArray(mimeTypes) ? mimeTypes : [mimeTypes]
  return {
    id: 'post-1',
    files: list.map((mimeType, i) => ({ id: `f${i + 1}`, mimeType })),
  } as unknown as PostDetailEntity
}

/**
 * `readyFiles` defaults to `supportedFiles` in the `'ready'` state on purpose. A ready post whose
 * ready count is short of its supported count is the partially-indexed case, which now renders its
 * own warning — so a hardcoded `readyFiles: 0` would silently opt every unrelated `'ready'` test
 * into that warning and assert around a post state the test never meant to describe.
 */
function givenStatus(
  state: IndexStatus['state'],
  indexedChunks = 0,
  overrides: Partial<Pick<IndexStatus, 'supportedFiles' | 'readyFiles'>> = {},
): void {
  const supportedFiles = overrides.supportedFiles ?? 1
  mocks.status = {
    state,
    indexedChunks,
    supportedFiles,
    readyFiles: overrides.readyFiles ?? (state === 'ready' ? supportedFiles : 0),
  }
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
    mocks.messages = []
    mocks.sendMessage.mockReset()
  })

  it('shows the preparing notice with the live chunk count', async () => {
    givenStatus('preparing', 32)
    await renderOpened()

    // Asserted on raw textContent, NOT toHaveTextContent: that matcher normalises whitespace,
    // so it would still pass if the words ran together as "sectionsso far" via a stray
    // non-space character. This pins the spacing exactly.
    expect(screen.getByRole('status').textContent).toBe(
      'Preparing this document for AI chat — indexed 32 sections so far. ' +
        "You can ask questions now, but answers won't cite page numbers until this finishes.",
    )
  })

  it('says "1 section" rather than "1 sections"', async () => {
    // The singular branch of the count label had no coverage, so pluralisation could regress
    // silently — and 1 is a state every document passes through while indexing.
    givenStatus('preparing', 1)
    await renderOpened()

    expect(screen.getByRole('status').textContent).toContain('indexed 1 section so far.')
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

  it('says a document is missing when the post reports ready but not every file indexed', async () => {
    // `getAiIndexStatus` settles on 'ready' as soon as ONE file is READY, and retrieval filters to
    // READY files -- so a post with one good PDF and one failed PDF answers and cites from half of
    // itself with no caveat anywhere. The student has no way to know a document is missing.
    givenStatus('ready', 40, { supportedFiles: 2, readyFiles: 1 })
    await renderOpened(makePost([PDF, PDF]))

    // Exact textContent, not toHaveTextContent: that matcher normalises whitespace, which is how
    // the "sectionsso far" spacing bug survived a passing test in this same file.
    expect(screen.getByRole('status').textContent).toBe(
      "1 of 2 documents couldn't be prepared for AI chat — answers won't cover it.",
    )
    expect(screen.getByPlaceholderText(/ask about this document/i)).toBeEnabled()
  })

  it('pluralises the pronoun when more than one document is missing', async () => {
    givenStatus('ready', 40, { supportedFiles: 3, readyFiles: 1 })
    await renderOpened(makePost([PDF, PDF, PDF]))

    expect(screen.getByRole('status').textContent).toBe(
      "2 of 3 documents couldn't be prepared for AI chat — answers won't cover them.",
    )
  })

  it('shows no missing-document notice when every supported file is ready', async () => {
    // Pins the comparison as strictly "fewer ready than supported". A `<=` here would warn on
    // every fully-indexed multi-file post, which is noise that trains students to ignore it.
    givenStatus('ready', 40, { supportedFiles: 2, readyFiles: 2 })
    await renderOpened(makePost([PDF, PDF]))

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText(/couldn't be prepared/i)).not.toBeInTheDocument()
  })

  it('does not call a still-preparing file a missing one', async () => {
    // While indexing is in flight, readyFiles < supportedFiles is the ORDINARY condition, not a
    // failure. The preparing notice already covers it; a second notice saying a document couldn't
    // be prepared would be wrong, because it still might be.
    givenStatus('preparing', 12, { supportedFiles: 2, readyFiles: 1 })
    await renderOpened(makePost([PDF, PDF]))

    expect(screen.getByRole('status').textContent).toContain('Preparing this document')
    expect(screen.queryByText(/couldn't be prepared/i)).not.toBeInTheDocument()
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

function assistant(content: string, citations: ChatMessage['citations'] = []): ChatMessage {
  return { role: 'assistant', content, citations }
}

describe('PostAiChat citations', () => {
  beforeEach(() => {
    mocks.status = undefined
    mocks.messages = []
    mocks.sendMessage.mockReset()
  })

  it('labels the pages as sources consulted, not as attribution for a claim', async () => {
    givenStatus('ready', 40)
    mocks.messages = [
      { role: 'user', content: 'What is an eigenvalue?' },
      assistant('A scalar λ such that Av = λv.', [
        { chunkId: 'c1', pageNum: 12, snippet: 'Eigenvalues…' },
      ]),
    ]
    await renderOpened()

    // Exact textContent, not toHaveTextContent: that matcher normalises whitespace and would
    // hide "p.12" or a missing space, which is exactly the class of bug that shipped here once.
    expect(screen.getByRole('note').textContent).toBe('Sources consultedp. 12')
  })

  it('puts the sources under the whole answer, never above it or inline beside it', async () => {
    // The one constraint this feature hangs on. Every other citation assertion is scoped inside
    // the footer, which leaves its POSITION unpinned — and a footer sitting inline next to a
    // sentence is exactly the "this sentence came from page 12" reading the design forbids.
    givenStatus('ready', 40)
    mocks.messages = [
      assistant('A scalar λ such that Av = λv.', [
        { chunkId: 'c1', pageNum: 12, snippet: 'Eigenvalues…' },
      ]),
    ]
    await renderOpened()

    const body = screen.getByRole('note').parentElement!

    // DOM order: the answer first, the sources after it.
    expect(body.textContent).toBe('A scalar λ such that Av = λv.Sources consultedp. 12')
    // jsdom has no layout engine, so the stacking direction can only be asserted through the
    // class that produces it. `flex-row` here would sit the chips beside the sentence.
    expect(body).toHaveClass('flex-col')
    expect(body).not.toHaveClass('flex-row')
    // The rule that reads the block as a footer rather than as a trailing caption.
    expect(screen.getByRole('note')).toHaveClass('border-t')
  })

  it('de-duplicates and orders the pages, because the top chunks repeat a page', async () => {
    givenStatus('ready', 40)
    mocks.messages = [
      assistant('It is covered in two places.', [
        { chunkId: 'c1', pageNum: 12, snippet: 'a' },
        { chunkId: 'c2', pageNum: 12, snippet: 'b' },
        { chunkId: 'c3', pageNum: 3, snippet: 'c' },
      ]),
    ]
    await renderOpened()

    expect(screen.getByRole('note').textContent).toBe('Sources consultedp. 3p. 12')
  })

  it('shows no page chips on a multi-file post, because "p. 3" cannot say which file', async () => {
    // `pageNum` restarts at 1 in every file (@@unique([fileId, chunkIndex])) and a citation
    // carries no file identity at all, so a chunk from page 3 of the past paper and a chunk from
    // page 3 of the solutions are indistinguishable by the time they reach here. The de-duplicated
    // single "p. 3" chip therefore points the student at the wrong document half the time -- which
    // is precisely the failure the whole citation feature exists to prevent. Suppress rather than
    // guess.
    givenStatus('ready', 40, { supportedFiles: 2, readyFiles: 2 })
    mocks.messages = [
      assistant('It is covered in both documents.', [
        { chunkId: 'c1', pageNum: 3, snippet: 'from the past paper' },
        { chunkId: 'c2', pageNum: 3, snippet: 'from the solutions' },
      ]),
    ]
    await renderOpened(makePost([PDF, PDF]))

    expect(screen.getByRole('note').textContent).toBe(
      'Sources consulted2 excerpts · from multiple documents',
    )
    expect(screen.queryByText(/p\. 3/)).not.toBeInTheDocument()
  })

  it('counts every excerpt on a multi-file post, including ones with no page at all', async () => {
    // The count must not be drawn from the (now unused) page list, or unpaginated excerpts would
    // silently vanish from the total the student is shown.
    givenStatus('ready', 40, { supportedFiles: 2, readyFiles: 2 })
    mocks.messages = [
      assistant('Mixed.', [
        { chunkId: 'c1', pageNum: 3, snippet: 'a' },
        { chunkId: 'c2', pageNum: null, snippet: 'b' },
        { chunkId: 'c3', pageNum: 9, snippet: 'c' },
      ]),
    ]
    await renderOpened(makePost([PDF, PDF]))

    expect(screen.getByRole('note').textContent).toBe(
      'Sources consulted3 excerpts · from multiple documents',
    )
  })

  it('still shows page chips when only one file on the post is a supported document', async () => {
    // The ambiguity comes from having more than one INDEXABLE file, not from the raw attachment
    // count. A PDF next to a screenshot has exactly one source of page numbers, so suppressing
    // there would throw away a citation that is perfectly unambiguous.
    givenStatus('ready', 40)
    mocks.messages = [assistant('On page 12.', [{ chunkId: 'c1', pageNum: 12, snippet: 'a' }])]
    await renderOpened(makePost([PDF, 'image/png']))

    expect(screen.getByRole('note').textContent).toBe('Sources consultedp. 12')
  })

  it('never renders a page label for a null pageNum', async () => {
    // .docx has no pagination, so mammoth yields a single page and pageNum is null. Inventing
    // "p. null" / "p. 1" here would be a fabricated citation.
    givenStatus('ready', 40)
    mocks.messages = [
      assistant('The document defines it in the introduction.', [
        { chunkId: 'c1', pageNum: null, snippet: 'a' },
        { chunkId: 'c2', pageNum: null, snippet: 'b' },
      ]),
    ]
    await renderOpened()

    expect(screen.getByRole('note').textContent).toBe(
      'Sources consulted2 excerpts · no page numbers',
    )
    expect(screen.queryByText(/p\./)).not.toBeInTheDocument()
  })

  it('keeps only the pages it actually has when pageNum is mixed', async () => {
    givenStatus('ready', 40)
    mocks.messages = [
      assistant('Mixed sources.', [
        { chunkId: 'c1', pageNum: null, snippet: 'a' },
        { chunkId: 'c2', pageNum: 7, snippet: 'b' },
      ]),
    ]
    await renderOpened()

    expect(screen.getByRole('note').textContent).toBe('Sources consultedp. 7')
  })

  it('uses the singular noun for one unpaginated excerpt', async () => {
    givenStatus('ready', 40)
    mocks.messages = [assistant('From the docx.', [{ chunkId: 'c1', pageNum: null, snippet: 'a' }])]
    await renderOpened()

    expect(screen.getByRole('note').textContent).toBe(
      'Sources consulted1 excerpt · no page numbers',
    )
  })

  it('does not quote the snippet, which is a 160-char mid-sentence fragment', async () => {
    givenStatus('ready', 40)
    mocks.messages = [
      assistant('Answer.', [
        { chunkId: 'c1', pageNum: 4, snippet: 'ansform of a function f is defined as the integ' },
      ]),
    ]
    await renderOpened()

    expect(screen.queryByText(/ansform of a function/)).not.toBeInTheDocument()
  })

  it('shows no sources block on an off-topic refusal', async () => {
    givenStatus('ready', 40)
    mocks.messages = [
      {
        role: 'assistant',
        content: 'I can only answer questions about this document.',
        offTopic: true,
        citations: [],
      },
    ]
    await renderOpened()

    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    expect(screen.queryByText(/sources consulted/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/OFF_TOPIC/)).not.toBeInTheDocument()
  })

  it('does not trail a previous turn’s pages onto a later uncited answer', async () => {
    givenStatus('ready', 40)
    mocks.messages = [
      assistant('Page 12 covers it.', [{ chunkId: 'c1', pageNum: 12, snippet: 'a' }]),
      {
        role: 'assistant',
        content: 'I can only answer questions about this document.',
        offTopic: true,
        citations: [],
      },
    ]
    await renderOpened()

    expect(screen.getAllByRole('note')).toHaveLength(1)
  })

  it('renders no sources block when the answer carries no citations at all', async () => {
    givenStatus('ready', 40)
    mocks.messages = [assistant('Something went wrong. Please try again.')]
    await renderOpened()

    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })
})

describe('PostAiChat transient conversation notice', () => {
  beforeEach(() => {
    mocks.status = undefined
    mocks.messages = []
    mocks.sendMessage.mockReset()
  })

  it('warns in the empty state that the conversation is not saved', async () => {
    // Chat persistence is deliberately out of scope, so losing the thread on refresh must not
    // come as a surprise. Exact textContent pins the sentence and its spacing.
    givenStatus('ready', 40)
    await renderOpened()

    expect(screen.getByText(/ask a question about this document/i).textContent).toBe(
      "Ask a question about this document. This conversation isn't saved — it clears when you leave the page.",
    )
  })

  it('keeps a short reminder next to the input once the conversation starts', async () => {
    givenStatus('ready', 40)
    mocks.messages = [assistant('Answer.')]
    await renderOpened()

    const reminder = screen.getByText('Not saved')
    expect(reminder).toBeInTheDocument()
    // It must sit outside the scrolling message list, or it scrolls away with the history.
    expect(reminder.closest('.overflow-y-auto')).toBeNull()
  })

  it('does not repeat the reminder while the empty state already says it', async () => {
    givenStatus('ready', 40)
    await renderOpened()

    expect(screen.queryByText('Not saved')).not.toBeInTheDocument()
  })
})
