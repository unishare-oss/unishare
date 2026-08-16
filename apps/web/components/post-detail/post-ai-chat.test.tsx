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

/** A citation defaulting to a single unnamed document, so tests opt IN to multi-file cases. */
function cite(
  chunkId: string,
  pageNum: number | null,
  snippet: string,
  file: { fileId: string; fileName: string } = { fileId: 'f1', fileName: 'notes.pdf' },
) {
  return { chunkId, pageNum, snippet, ...file }
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
      assistant('A scalar λ such that Av = λv.', [cite('c1', 12, 'Eigenvalues…')]),
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
    mocks.messages = [assistant('A scalar λ such that Av = λv.', [cite('c1', 12, 'Eigenvalues…')])]
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
        cite('c1', 12, 'a'),
        cite('c2', 12, 'b'),
        cite('c3', 3, 'c'),
      ]),
    ]
    await renderOpened()

    expect(screen.getByRole('note').textContent).toBe('Sources consultedp. 3p. 12')
  })

  it('names the document on a multi-file post, because "p. 3" alone cannot', async () => {
    // `pageNum` restarts at 1 in every file (@@unique([fileId, chunkIndex])), so page 3 of the
    // past paper and page 3 of the solutions are the same number meaning different things. Citing
    // a bare "p. 3" would point the student at the wrong document half the time — precisely the
    // failure the citation feature exists to prevent — and de-duplicating across files would
    // collapse the two into one chip.
    givenStatus('ready', 40, { supportedFiles: 2, readyFiles: 2 })
    mocks.messages = [
      assistant('It is covered in both documents.', [
        cite('c1', 3, 'from the past paper', { fileId: 'f1', fileName: 'paper.pdf' }),
        cite('c2', 3, 'from the solutions', { fileId: 'f2', fileName: 'solutions.pdf' }),
      ]),
    ]
    await renderOpened(makePost([PDF, PDF]))

    // Both survive as distinct chips, each naming its document.
    expect(screen.getByRole('note').textContent).toBe(
      'Sources consultedpaper.pdf p. 3solutions.pdf p. 3',
    )
  })

  it('keeps two same-named files apart, because the name is a label and the id is the identity', async () => {
    // Uploading "notes.pdf" twice is ordinary. Grouping by NAME would merge them, de-duplicate
    // their page 3s into one chip, and reintroduce exactly the ambiguity this feature removed —
    // while looking correct, because the label would still read "notes.pdf p. 3".
    givenStatus('ready', 40, { supportedFiles: 2, readyFiles: 2 })
    mocks.messages = [
      assistant('Both parts cover it.', [
        cite('c1', 3, 'part one', { fileId: 'f1', fileName: 'notes.pdf' }),
        cite('c2', 3, 'part two', { fileId: 'f2', fileName: 'notes.pdf' }),
      ]),
    ]
    await renderOpened(makePost([PDF, PDF]))

    // Two chips, not one: the duplicate name is a display problem, not a reason to merge.
    expect(screen.getByRole('note').textContent).toBe(
      'Sources consultednotes.pdf p. 3notes.pdf p. 3',
    )
  })

  it('omits the filename when every citation came from the same document', async () => {
    // Repeating one filename on every chip is noise, and there is nothing to disambiguate. Note
    // this is decided from the CITATIONS, not the post's file list: a two-PDF post whose answer
    // drew on one document only needs no labels either.
    givenStatus('ready', 40, { supportedFiles: 2, readyFiles: 2 })
    mocks.messages = [
      assistant('Only the paper covers it.', [
        cite('c1', 3, 'a', { fileId: 'f1', fileName: 'paper.pdf' }),
        cite('c2', 8, 'b', { fileId: 'f1', fileName: 'paper.pdf' }),
      ]),
    ]
    await renderOpened(makePost([PDF, PDF]))

    expect(screen.getByRole('note').textContent).toBe('Sources consultedp. 3p. 8')
  })

  it('shows chips per document when only some documents have page numbers', async () => {
    // A PDF plus a .docx: mammoth gives the .docx no pages at all. The PDF's pages are still
    // worth showing, and each is named so it cannot be read as applying to the .docx.
    givenStatus('ready', 40, { supportedFiles: 2, readyFiles: 2 })
    mocks.messages = [
      assistant('Mixed.', [
        cite('c1', 3, 'a', { fileId: 'f1', fileName: 'paper.pdf' }),
        cite('c2', null, 'b', { fileId: 'f2', fileName: 'notes.docx' }),
        cite('c3', 9, 'c', { fileId: 'f1', fileName: 'paper.pdf' }),
      ]),
    ]
    await renderOpened(makePost([PDF, PDF]))

    // KNOWN LIMITATION, pinned deliberately: the .docx excerpt has no page and so contributes no
    // chip, meaning the footer under-reports how many excerpts were consulted. Under-informative
    // rather than misattributing — the reverse trade (inventing a page for it) is the one that
    // would mislead. Carrying an unpaginated marker per file is the follow-up.
    expect(screen.getByRole('note').textContent).toBe(
      'Sources consultedpaper.pdf p. 3paper.pdf p. 9',
    )
  })

  it('still shows page chips when only one file on the post is a supported document', async () => {
    // The ambiguity comes from having more than one INDEXABLE file, not from the raw attachment
    // count. A PDF next to a screenshot has exactly one source of page numbers, so suppressing
    // there would throw away a citation that is perfectly unambiguous.
    givenStatus('ready', 40)
    mocks.messages = [assistant('On page 12.', [cite('c1', 12, 'a')])]
    await renderOpened(makePost([PDF, 'image/png']))

    expect(screen.getByRole('note').textContent).toBe('Sources consultedp. 12')
  })

  it('never renders a page label for a null pageNum', async () => {
    // .docx has no pagination, so mammoth yields a single page and pageNum is null. Inventing
    // "p. null" / "p. 1" here would be a fabricated citation.
    givenStatus('ready', 40)
    mocks.messages = [
      assistant('The document defines it in the introduction.', [
        cite('c1', null, 'a'),
        cite('c2', null, 'b'),
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
    mocks.messages = [assistant('Mixed sources.', [cite('c1', null, 'a'), cite('c2', 7, 'b')])]
    await renderOpened()

    expect(screen.getByRole('note').textContent).toBe('Sources consultedp. 7')
  })

  it('uses the singular noun for one unpaginated excerpt', async () => {
    givenStatus('ready', 40)
    mocks.messages = [assistant('From the docx.', [cite('c1', null, 'a')])]
    await renderOpened()

    expect(screen.getByRole('note').textContent).toBe(
      'Sources consulted1 excerpt · no page numbers',
    )
  })

  it('does not quote the snippet, which is a 160-char mid-sentence fragment', async () => {
    givenStatus('ready', 40)
    mocks.messages = [
      assistant('Answer.', [cite('c1', 4, 'ansform of a function f is defined as the integ')]),
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
      assistant('Page 12 covers it.', [cite('c1', 12, 'a')]),
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
