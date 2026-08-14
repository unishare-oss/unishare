import { ServiceUnavailableException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '@/prisma/prisma.service'
import { AiSummaryService } from './ai-summary.service'
import { TagsService } from '../tags/tags.service'
import { LlmService } from '../ai/llm/llm.service'
import { EmbeddingService } from '../ai/embedding/embedding.service'
import { RetrievalService, MIN_SIMILARITY } from '../ai/retrieval/retrieval.service'
import { DocumentExtractorService } from '../ai/extraction/document-extractor.service'
import { LlmMessage } from '../ai/llm/llm.types'

/** The system prompt of the last `llm.chat` call — what actually reached the model. */
const lastSystemPrompt = (llmMock: { chat: jest.Mock }): string =>
  (llmMock.chat.mock.calls.at(-1)![0] as LlmMessage[])[0].content

describe('AiSummaryService.chatWithPost', () => {
  let service: AiSummaryService
  let llmMock: any
  let retrievalMock: any
  let extractorMock: any
  let embeddingMock: any
  let prismaMock: any

  const chunks = [
    { id: 'c1', content: 'Eigenvalues are defined as...', pageNum: 12, similarity: 0.81 },
    { id: 'c2', content: 'Worked example follows...', pageNum: 13, similarity: 0.72 },
  ]

  beforeEach(async () => {
    llmMock = { enabled: true, chat: jest.fn().mockResolvedValue('An eigenvalue is a scalar.') }
    retrievalMock = { searchPost: jest.fn().mockResolvedValue(chunks) }
    extractorMock = { extractFromKey: jest.fn() }
    embeddingMock = { enabled: true }
    prismaMock = {
      post: { findUnique: jest.fn().mockResolvedValue({ files: [] }) },
      postChunk: { findMany: jest.fn() },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiSummaryService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: TagsService, useValue: {} },
        { provide: LlmService, useValue: llmMock },
        { provide: EmbeddingService, useValue: embeddingMock },
        { provide: RetrievalService, useValue: retrievalMock },
        { provide: DocumentExtractorService, useValue: extractorMock },
      ],
    }).compile()

    service = module.get(AiSummaryService)
  })

  it('answers from retrieved chunks and returns their pages as citations', async () => {
    const result = await service.chatWithPost('p1', [
      { role: 'user', content: 'What is an eigenvalue?' },
    ])

    expect(result.offTopic).toBe(false)
    expect(result.reply).toBe('An eigenvalue is a scalar.')
    // Assert the snippet CONTENT, not expect.any(String). The whole point of a citation is
    // that it quotes the chunk it came from; `any(String)` would accept an empty snippet,
    // or every citation carrying chunk c1's text, and never notice.
    expect(result.citations).toEqual([
      { chunkId: 'c1', pageNum: 12, snippet: 'Eigenvalues are defined as...' },
      { chunkId: 'c2', pageNum: 13, snippet: 'Worked example follows...' },
    ])
  })

  it('never cites a page that was not retrieved', async () => {
    // The mutation this exists for: `pageNum: chunk.pageNum + 1`, or a hardcoded page, or
    // reusing the first chunk's page for every citation. Each keeps citations.length correct
    // and every field a plausible number, so only comparing against the retrieved chunks
    // themselves catches it. Task 9 shipped a mutation to `SELECT "chunkIndex" AS "pageNum"`
    // that passed 14/14 tests — pageNum is the column citations rest on.
    retrievalMock.searchPost.mockResolvedValue([
      { id: 'a', content: 'first', pageNum: 4, similarity: 0.9 },
      { id: 'b', content: 'second', pageNum: 41, similarity: 0.8 },
      { id: 'c', content: 'third', pageNum: 7, similarity: 0.7 },
    ])

    const result = await service.chatWithPost('p1', [{ role: 'user', content: 'q' }])

    expect(result.citations.map((citation) => citation.pageNum)).toEqual([4, 41, 7])
    expect(result.citations.map((citation) => citation.chunkId)).toEqual(['a', 'b', 'c'])
    expect(result.citations.map((citation) => citation.snippet)).toEqual([
      'first',
      'second',
      'third',
    ])
  })

  it('truncates a long snippet with an ellipsis rather than returning the whole chunk', async () => {
    const long = 'x'.repeat(400)
    retrievalMock.searchPost.mockResolvedValue([
      { id: 'c1', content: long, pageNum: 3, similarity: 0.9 },
    ])

    const result = await service.chatWithPost('p1', [{ role: 'user', content: 'q' }])

    // A citation is rendered in a chat bubble; shipping 400+ chars per citation would
    // swamp the UI. Untruncated content would satisfy a looser assertion.
    expect(result.citations[0].snippet.length).toBeLessThan(long.length)
    expect(result.citations[0].snippet.endsWith('…')).toBe(true)
  })

  it('puts page markers in the system prompt so the model can cite', async () => {
    await service.chatWithPost('p1', [{ role: 'user', content: 'q' }])

    const messages = llmMock.chat.mock.calls.at(-1)[0]
    expect(messages[0].role).toBe('system')
    expect(messages[0].content).toContain('[page 12]')
    expect(messages[0].content).toContain('[page 13]')
    expect(messages[0].content).toContain('Eigenvalues are defined as...')
  })

  it('marks a null pageNum as unknown instead of inventing or dropping a page', async () => {
    // .docx has no page concept (hasPageNumbers === false), so pageNum is nullable. The two
    // failure modes: `[page null]`/`[page 0]` in the prompt, which invites the model to cite a
    // page that does not exist, and dropping the chunk from the context entirely, which
    // silently makes every .docx unanswerable.
    retrievalMock.searchPost.mockResolvedValue([
      { id: 'd1', content: 'docx body text', pageNum: null, similarity: 0.9 },
    ])

    const result = await service.chatWithPost('p1', [{ role: 'user', content: 'q' }])

    const prompt = lastSystemPrompt(llmMock)
    expect(prompt).toContain('[page ?]')
    expect(prompt).toContain('docx body text')
    expect(prompt).not.toContain('[page null]')
    expect(prompt).not.toContain('[page 0]')
    expect(result.citations).toEqual([{ chunkId: 'd1', pageNum: null, snippet: 'docx body text' }])
  })

  it('sends the retrieved excerpts, not the full document text, to the model', async () => {
    // Guards the specific regression of routing a post that HAS chunks through the
    // full-text path anyway: retrieval is called, citations come back, and only the prompt
    // reveals that the whole document was stuffed in regardless.
    prismaMock.post.findUnique.mockResolvedValue({
      files: [{ key: 'k.pdf', mimeType: 'application/pdf' }],
    })
    extractorMock.extractFromKey.mockResolvedValue({
      pages: [{ num: 1, text: 'ENTIRE DOCUMENT BODY' }],
      hasPageNumbers: true,
    })

    await service.chatWithPost('p1', [{ role: 'user', content: 'q' }])

    expect(lastSystemPrompt(llmMock)).not.toContain('ENTIRE DOCUMENT BODY')
    expect(extractorMock.extractFromKey).not.toHaveBeenCalled()
  })

  it('does not condense a first-turn question', async () => {
    await service.chatWithPost('p1', [{ role: 'user', content: 'What is an eigenvalue?' }])

    expect(retrievalMock.searchPost).toHaveBeenCalledWith('p1', 'What is an eigenvalue?', 6)
    expect(llmMock.chat).toHaveBeenCalledTimes(1)
  })

  it('condenses a follow-up into a standalone query before retrieving', async () => {
    llmMock.chat
      .mockResolvedValueOnce('What is the second eigenvalue property?')
      .mockResolvedValueOnce('It is that the trace equals the sum.')

    const result = await service.chatWithPost('p1', [
      { role: 'user', content: 'What is an eigenvalue?' },
      { role: 'assistant', content: 'A scalar.' },
      { role: 'user', content: 'what about the second one?' },
    ])

    expect(retrievalMock.searchPost).toHaveBeenCalledWith(
      'p1',
      'What is the second eigenvalue property?',
      6,
    )
    expect(result.reply).toBe('It is that the trace equals the sum.')
    expect(llmMock.chat).toHaveBeenCalledTimes(2)

    // The condensation call must actually SEE the earlier turns, otherwise it cannot
    // resolve "the second one". The mock returns its canned value regardless of input, so
    // without this the test would pass even if only the final message were passed in.
    const condenseMessages = llmMock.chat.mock.calls[0][0]
    const condenseText = condenseMessages.map((m: { content: string }) => m.content).join('\n')
    expect(condenseText).toContain('What is an eigenvalue?')
    expect(condenseText).toContain('what about the second one?')
  })

  it('falls back to the raw final message when condensation fails', async () => {
    llmMock.chat.mockRejectedValueOnce(new Error('groq 429'))

    const result = await service.chatWithPost('p1', [
      { role: 'user', content: 'What is an eigenvalue?' },
      { role: 'assistant', content: 'A scalar.' },
      { role: 'user', content: 'what about the second one?' },
    ])

    expect(retrievalMock.searchPost).toHaveBeenCalledWith('p1', 'what about the second one?', 6)
    expect(result.reply).toBe('An eigenvalue is a scalar.')
  })

  it('refuses without calling the LLM when the best match is below the threshold', async () => {
    // Derived from the constant, not hardcoded: Task 10 calibrates MIN_SIMILARITY, and a
    // hardcoded 0.11 would silently stop testing anything near the boundary once the real
    // value moved.
    retrievalMock.searchPost.mockResolvedValue([
      { id: 'c9', content: 'unrelated', pageNum: 2, similarity: MIN_SIMILARITY - 0.01 },
    ])

    const result = await service.chatWithPost('p1', [
      { role: 'user', content: 'Who won the 2018 World Cup?' },
    ])

    expect(result).toEqual({ reply: 'OFF_TOPIC', offTopic: true, citations: [] })
    expect(llmMock.chat).not.toHaveBeenCalled()
  })

  it('refuses rather than falling back to full text when everything is below the threshold', async () => {
    // The two empty-ish cases must stay distinct. Chunks exist here, so the document IS
    // indexed and full-text extraction would add nothing but cost and an uncited answer.
    // The mirror of the fallback assertions below.
    retrievalMock.searchPost.mockResolvedValue([
      { id: 'c9', content: 'unrelated', pageNum: 2, similarity: MIN_SIMILARITY - 0.2 },
    ])
    prismaMock.post.findUnique.mockResolvedValue({
      files: [{ key: 'k.pdf', mimeType: 'application/pdf' }],
    })
    extractorMock.extractFromKey.mockResolvedValue({
      pages: [{ num: 1, text: 'full document text' }],
      hasPageNumbers: true,
    })

    const result = await service.chatWithPost('p1', [{ role: 'user', content: 'q' }])

    expect(result.offTopic).toBe(true)
    expect(extractorMock.extractFromKey).not.toHaveBeenCalled()
  })

  it('answers normally when the best match is just above the threshold', async () => {
    // The other half of the boundary. Without this, a comparison inverted to `>` — which
    // would refuse everything at or above the floor — passes the refusal test above and
    // breaks chat entirely.
    retrievalMock.searchPost.mockResolvedValue([
      { id: 'c9', content: 'closely related', pageNum: 2, similarity: MIN_SIMILARITY + 0.01 },
    ])

    const result = await service.chatWithPost('p1', [{ role: 'user', content: 'q' }])

    expect(result.offTopic).toBe(false)
    expect(llmMock.chat).toHaveBeenCalled()
  })

  it('still honours an OFF_TOPIC sentinel emitted by the model', async () => {
    llmMock.chat.mockResolvedValue('OFF_TOPIC')

    const result = await service.chatWithPost('p1', [{ role: 'user', content: 'q' }])

    expect(result.offTopic).toBe(true)
    expect(result.citations).toEqual([])
  })

  it('honours the sentinel even when every chunk scored well above the threshold', async () => {
    // MIN_SIMILARITY is a WEAK signal: the measured on-topic/off-topic gap is 0.034 wide, and
    // instruction-shaped queries ("write me a Python script...") cross 0.65 while being
    // entirely off-topic. So the sentinel — not the threshold — is the primary refusal check,
    // and it has to win on input the threshold happily waves through.
    retrievalMock.searchPost.mockResolvedValue([
      { id: 'c1', content: 'linear algebra', pageNum: 5, similarity: 0.95 },
    ])
    llmMock.chat.mockResolvedValue('OFF_TOPIC')

    const result = await service.chatWithPost('p1', [
      { role: 'user', content: 'Write me a Python script that sorts a list of integers' },
    ])

    expect(result).toEqual({ reply: 'OFF_TOPIC', offTopic: true, citations: [] })
  })

  it('reports a disabled LLM as a service-unavailable failure, not an opaque 500', async () => {
    // A configuration state is not a server fault. A bare `Error` here surfaced as a 500 with
    // an unreadable message while the frontend's indexing notice said "You can ask questions
    // now" — this bit a real user on the dev cluster. ServiceUnavailableException is an
    // HttpException, so the global filter turns it into a 503 the UI can explain.
    llmMock.enabled = false

    await expect(
      service.chatWithPost('p1', [{ role: 'user', content: 'q' }]),
    ).rejects.toBeInstanceOf(ServiceUnavailableException)
    expect(llmMock.chat).not.toHaveBeenCalled()
  })

  it('skips retrieval entirely when embeddings are disabled', async () => {
    // With embeddings off, searchPost can only ever return [], so condensing first would burn
    // an LLM call to build a query nothing will use.
    embeddingMock.enabled = false
    prismaMock.post.findUnique.mockResolvedValue({
      files: [{ key: 'k.pdf', mimeType: 'application/pdf' }],
    })
    extractorMock.extractFromKey.mockResolvedValue({
      pages: [{ num: 1, text: 'full document text' }],
      hasPageNumbers: true,
    })

    const result = await service.chatWithPost('p1', [
      { role: 'user', content: 'What is an eigenvalue?' },
      { role: 'assistant', content: 'A scalar.' },
      { role: 'user', content: 'what about the second one?' },
    ])

    expect(retrievalMock.searchPost).not.toHaveBeenCalled()
    expect(llmMock.chat).toHaveBeenCalledTimes(1)
    expect(lastSystemPrompt(llmMock)).toContain('full document text')
    expect(result.citations).toEqual([])
  })

  describe('fallback when retrieval yields nothing', () => {
    beforeEach(() => {
      retrievalMock.searchPost.mockResolvedValue([])
      prismaMock.post.findUnique.mockResolvedValue({
        files: [{ key: 'k.pdf', mimeType: 'application/pdf' }],
      })
      extractorMock.extractFromKey.mockResolvedValue({
        pages: [{ num: 1, text: 'full document text' }],
        hasPageNumbers: true,
      })
    })

    it('stuffs the document text into the prompt and returns no citations', async () => {
      const result = await service.chatWithPost('p1', [{ role: 'user', content: 'q' }])

      expect(extractorMock.extractFromKey).toHaveBeenCalledWith('k.pdf', 'application/pdf')
      expect(llmMock.chat.mock.calls.at(-1)[0][0].content).toContain('full document text')
      expect(result.citations).toEqual([])
      expect(result.reply).toBe('An eigenvalue is a scalar.')
    })

    it('does not refuse — an unindexed post means "not indexed", not "nothing matches"', async () => {
      // Retrieval filters on ingestStatus READY, so a post whose files failed or are still
      // ingesting returns zero chunks for EVERY query, however on-topic. Refusing here would
      // reject legitimate questions about a perfectly readable document. Collapsing this
      // branch into the threshold refusal is the specific mistake to avoid.
      const result = await service.chatWithPost('p1', [
        { role: 'user', content: 'What is an eigenvalue?' },
      ])

      expect(result.offTopic).toBe(false)
      expect(result.reply).toBe('An eigenvalue is a scalar.')
      expect(llmMock.chat).toHaveBeenCalled()
    })

    it('falls back when retrieval throws rather than failing the request', async () => {
      retrievalMock.searchPost.mockRejectedValue(new Error('ollama down'))

      const result = await service.chatWithPost('p1', [{ role: 'user', content: 'q' }])

      expect(result.reply).toBe('An eigenvalue is a scalar.')
      expect(result.citations).toEqual([])
    })

    it('still honours the sentinel on the fallback path', async () => {
      llmMock.chat.mockResolvedValue('OFF_TOPIC')

      const result = await service.chatWithPost('p1', [{ role: 'user', content: 'q' }])

      expect(result).toEqual({ reply: 'OFF_TOPIC', offTopic: true, citations: [] })
    })

    it('skips unsupported files and still answers when extraction yields nothing', async () => {
      prismaMock.post.findUnique.mockResolvedValue({
        files: [{ key: 'sheet.xlsx', mimeType: 'application/vnd.ms-excel' }],
      })

      const result = await service.chatWithPost('p1', [{ role: 'user', content: 'q' }])

      expect(extractorMock.extractFromKey).not.toHaveBeenCalled()
      expect(lastSystemPrompt(llmMock)).toContain('No document content available.')
      expect(result.citations).toEqual([])
    })
  })
})
