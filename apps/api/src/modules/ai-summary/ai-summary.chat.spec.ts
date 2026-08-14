import { NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '@/prisma/prisma.service'
import { AiSummaryService, SNIPPET_CHARS } from './ai-summary.service'
import { TagsService } from '../tags/tags.service'
import { LlmService } from '../ai/llm/llm.service'
import { EmbeddingService } from '../ai/embedding/embedding.service'
import {
  RetrievalService,
  MIN_SIMILARITY,
  RETRIEVAL_TOP_K,
} from '../ai/retrieval/retrieval.service'
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
    expect(result.citations[0].snippet.endsWith('…')).toBe(true)
    // The LENGTH is pinned to a literal, not to SNIPPET_CHARS. Asserting against the imported
    // constant would track any change to it, so widening 160 to 300 — six citations of prompt
    // and bubble growth per reply — would pass silently. This is the tripwire: if the budget
    // moves deliberately, both numbers move together.
    expect(SNIPPET_CHARS).toBe(160)
    expect(result.citations[0].snippet).toHaveLength(161) // 160 chars + the ellipsis
  })

  it('leaves a snippet exactly at the budget untruncated', async () => {
    // The off-by-one boundary: `>` rather than `>=`. A chunk of exactly SNIPPET_CHARS needs no
    // ellipsis, and appending one would claim text was cut that was not.
    const exact = 'y'.repeat(SNIPPET_CHARS)
    retrievalMock.searchPost.mockResolvedValue([
      { id: 'c1', content: exact, pageNum: 3, similarity: 0.9 },
    ])

    const result = await service.chatWithPost('p1', [{ role: 'user', content: 'q' }])

    expect(result.citations[0].snippet).toBe(exact)
    expect(result.citations[0].snippet.endsWith('…')).toBe(false)
  })

  it('puts page markers in the system prompt so the model can cite', async () => {
    await service.chatWithPost('p1', [{ role: 'user', content: 'q' }])

    const messages = llmMock.chat.mock.calls.at(-1)[0]
    expect(messages[0].role).toBe('system')
    expect(messages[0].content).toContain('[page 12]')
    expect(messages[0].content).toContain('[page 13]')
    expect(messages[0].content).toContain('Eigenvalues are defined as...')
  })

  it('instructs the model to distinguish "not in these excerpts" from off-topic', async () => {
    // v1 conflated the two: a question about the document's own subject that top-6 retrieval
    // missed came back as a bare OFF_TOPIC, telling the student their reasonable question was
    // unrelated. Measured live — "What does this document say about Fourier transforms?" against
    // eigenvalue excerpts. With top-k = 6 on a long document that is the COMMON miss, not an
    // edge case, so the split is the user-facing point of the v2 prompt.
    //
    // Asserted on the prompt that actually reaches llm.chat, and on both halves of the split:
    // rule 4 must forbid the sentinel for in-subject misses, and rule 5 must still mandate it
    // for genuinely unrelated questions. Collapsing them back into one rule fails here.
    await service.chatWithPost('p1', [{ role: 'user', content: 'q' }])

    const prompt = lastSystemPrompt(llmMock)
    expect(prompt).toContain('This is NOT off-topic')
    expect(prompt).toContain('suggest rephrasing')
    expect(prompt).toContain("unrelated to this document's subject altogether")
    expect(prompt).toContain('respond with exactly: OFF_TOPIC')
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

    expect(retrievalMock.searchPost).toHaveBeenCalledWith(
      'p1',
      'What is an eigenvalue?',
      RETRIEVAL_TOP_K,
    )
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
      RETRIEVAL_TOP_K,
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

    expect(retrievalMock.searchPost).toHaveBeenCalledWith(
      'p1',
      'what about the second one?',
      RETRIEVAL_TOP_K,
    )
    expect(result.reply).toBe('An eigenvalue is a scalar.')
  })

  describe('a below-threshold best match falls back and never refuses', () => {
    // MIN_SIMILARITY is a retrieval-QUALITY gate, not a refusal gate. It used to refuse here
    // pre-LLM with no fallback, on a floor whose on-topic side clears it by only 0.025 and
    // which was calibrated against clean authored prose — so a real question about a scanned
    // past paper could be flatly refused. Falling back can never wrongly refuse.
    //
    // Similarities are derived from the constant, never hardcoded: Task 10 calibrates
    // MIN_SIMILARITY, and a hardcoded 0.64 would silently stop testing the boundary once the
    // real value moved.
    beforeEach(() => {
      retrievalMock.searchPost.mockResolvedValue([
        { id: 'c9', content: 'weakly related', pageNum: 2, similarity: MIN_SIMILARITY - 0.01 },
      ])
      prismaMock.post.findUnique.mockResolvedValue({
        files: [{ key: 'k.pdf', mimeType: 'application/pdf' }],
      })
      extractorMock.extractFromKey.mockResolvedValue({
        pages: [{ num: 1, text: 'full document text' }],
        hasPageNumbers: true,
      })
    })

    it('answers from the full document text instead of refusing', async () => {
      const result = await service.chatWithPost('p1', [
        { role: 'user', content: 'Who won the 2018 World Cup?' },
      ])

      expect(result.offTopic).toBe(false)
      expect(result.reply).toBe('An eigenvalue is a scalar.')
      expect(extractorMock.extractFromKey).toHaveBeenCalledWith('k.pdf', 'application/pdf')
      expect(lastSystemPrompt(llmMock)).toContain('full document text')
    })

    it('emits no citations, because the weak chunks were not used', async () => {
      // Citations must describe what the answer was actually built from. The reply here came
      // from extracted full text, so citing the chunks that lost would be a fabricated source.
      const result = await service.chatWithPost('p1', [{ role: 'user', content: 'q' }])

      expect(result.citations).toEqual([])
    })

    it('logs the peak similarity, which is the only thing distinguishing it from empty retrieval', async () => {
      // Both branches now return the same shape by the same route, so this warning is the ONLY
      // observable difference between them — it is what makes a mutation merging the two
      // conditions detectable at all. It doubles as the calibration instrument for the open
      // question about 0.65 on real scanned uploads.
      const warn = jest.spyOn(service['logger'], 'warn').mockImplementation(() => {})

      await service.chatWithPost('p1', [{ role: 'user', content: 'q' }])

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('below MIN_SIMILARITY'))
      expect(warn).toHaveBeenCalledWith(expect.stringContaining((MIN_SIMILARITY - 0.01).toFixed(3)))
    })
  })

  it('does not log the below-threshold warning when retrieval simply returned nothing', async () => {
    // The mirror of the assertion above, and the other half of the discriminator: an unindexed
    // post takes the same route for a DIFFERENT reason, and must not claim a weak score it never
    // measured. Merging the two conditions into one `if` is caught here.
    const warn = jest.spyOn(service['logger'], 'warn').mockImplementation(() => {})
    retrievalMock.searchPost.mockResolvedValue([])
    prismaMock.post.findUnique.mockResolvedValue({
      files: [{ key: 'k.pdf', mimeType: 'application/pdf' }],
    })
    extractorMock.extractFromKey.mockResolvedValue({
      pages: [{ num: 1, text: 'full document text' }],
      hasPageNumbers: true,
    })

    await service.chatWithPost('p1', [{ role: 'user', content: 'q' }])

    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('below MIN_SIMILARITY'))
  })

  it('uses the retrieved excerpts when the best match is just above the threshold', async () => {
    // The other half of the boundary. Asserting on CITATIONS, not just `offTopic: false`: since
    // the below-threshold case now also answers with offTopic false, a comparison inverted to
    // `>` would send above-threshold traffic to the uncited fallback and still satisfy a
    // looser assertion. Non-empty citations are what prove the RAG path ran.
    retrievalMock.searchPost.mockResolvedValue([
      { id: 'c9', content: 'closely related', pageNum: 2, similarity: MIN_SIMILARITY + 0.01 },
    ])

    const result = await service.chatWithPost('p1', [{ role: 'user', content: 'q' }])

    expect(result.offTopic).toBe(false)
    expect(result.citations).toEqual([{ chunkId: 'c9', pageNum: 2, snippet: 'closely related' }])
    expect(lastSystemPrompt(llmMock)).toContain('[page 2]')
    expect(extractorMock.extractFromKey).not.toHaveBeenCalled()
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

  // The sentinel is the PRIMARY refusal check, and it used to require exact equality with
  // 'OFF_TOPIC'. Every near miss returned offTopic: false, which handed the student the literal
  // sentinel string as their answer WITH citations attached — strictly worse than the
  // pre-retrieval behaviour. A model appending a full stop is entirely ordinary, so each of
  // these is a likely production reply, not a contrived one. Every case asserts citations are
  // dropped too: a refusal wearing a sourcing badge is the actual user-visible harm.
  describe.each([
    ['a trailing full stop', 'OFF_TOPIC.'],
    ['a trailing colon', 'OFF_TOPIC:'],
    ['surrounding whitespace', '  OFF_TOPIC  '],
    ['lowercase', 'off_topic'],
    ['lowercase with a full stop and whitespace', '  off_topic.  '],
    ['markdown bold', '**OFF_TOPIC**'],
    ['double quotes', '"OFF_TOPIC"'],
    ['an em-dash explanation', 'OFF_TOPIC — this question is unrelated to the document'],
    ['a hyphen explanation', 'OFF_TOPIC - unrelated'],
    ['an explanation on the next line', 'OFF_TOPIC\nThis is not covered by the excerpts.'],
    ['mixed case with an exclamation', 'Off_Topic!'],
  ])('recognises a decorated sentinel: %s', (_label, reply) => {
    it('refuses, canonicalises the reply and drops the citations', async () => {
      llmMock.chat.mockResolvedValue(reply)

      const result = await service.chatWithPost('p1', [{ role: 'user', content: 'q' }])

      // The canonical 'OFF_TOPIC' is what the frontend switches on, so the decorated form must
      // never survive into the response either.
      expect(result).toEqual({ reply: 'OFF_TOPIC', offTopic: true, citations: [] })
    })
  })

  // The other direction, and the reason the match is anchored to the start of the first line
  // and requires a non-alphanumeric separator after the token. A student can legitimately ask
  // what OFF_TOPIC means; swallowing the model's explanation as a refusal would be a worse
  // failure than the one being fixed, because it is silent and unrecoverable for that user.
  describe.each([
    ['prose that begins with the token', 'OFF_TOPIC is the marker returned for unrelated asks.'],
    ['the token mid-sentence', 'The assistant replies OFF_TOPIC when a question is unrelated.'],
    ['a quoted mention', 'Page 3 defines the OFF_TOPIC convention used by the grader.'],
    // These two carry a SEPARATOR after the token — a full stop and a colon — so they are the
    // only cases that pin the start-of-line anchor. Without the anchor the pattern matches
    // anywhere and both of these become silent refusals; with a letter after the token (the
    // three above) the anchor makes no difference, so they cannot catch its removal.
    ['the token ending the sentence', 'Rule 4 says I should reply with OFF_TOPIC.'],
    ['the token before a colon', 'The excerpts never mention OFF_TOPIC: it is not defined here.'],
  ])('does not mistake discussion of the token for a refusal: %s', (_label, reply) => {
    it('answers normally and keeps the citations', async () => {
      llmMock.chat.mockResolvedValue(reply)

      const result = await service.chatWithPost('p1', [
        { role: 'user', content: 'what does OFF_TOPIC mean?' },
      ])

      expect(result.offTopic).toBe(false)
      expect(result.reply).toBe(reply)
      expect(result.citations).toHaveLength(2)
    })
  })

  it('recognises a decorated sentinel on the full-text fallback path too', async () => {
    // Both paths call isOffTopic; a fix applied to only one is a real possibility.
    retrievalMock.searchPost.mockResolvedValue([])
    prismaMock.post.findUnique.mockResolvedValue({
      files: [{ key: 'k.pdf', mimeType: 'application/pdf' }],
    })
    extractorMock.extractFromKey.mockResolvedValue({
      pages: [{ num: 1, text: 'full document text' }],
      hasPageNumbers: true,
    })
    llmMock.chat.mockResolvedValue('off_topic.')

    const result = await service.chatWithPost('p1', [{ role: 'user', content: 'q' }])

    expect(result).toEqual({ reply: 'OFF_TOPIC', offTopic: true, citations: [] })
  })

  it('reports a null reply from the provider as service-unavailable on the retrieval path', async () => {
    // llm.service.chat returns null whenever no provider is built, and a real provider can
    // return no choices (Groq under load). Part of the same status-code change as the
    // disabled-LLM gate, so it must not regress to a bare Error either.
    llmMock.chat.mockResolvedValue(null)

    await expect(
      service.chatWithPost('p1', [{ role: 'user', content: 'q' }]),
    ).rejects.toBeInstanceOf(ServiceUnavailableException)
  })

  it('reports a null reply as service-unavailable on the fallback path too', async () => {
    retrievalMock.searchPost.mockResolvedValue([])
    prismaMock.post.findUnique.mockResolvedValue({
      files: [{ key: 'k.pdf', mimeType: 'application/pdf' }],
    })
    extractorMock.extractFromKey.mockResolvedValue({
      pages: [{ num: 1, text: 'full document text' }],
      hasPageNumbers: true,
    })
    llmMock.chat.mockResolvedValue(null)

    await expect(
      service.chatWithPost('p1', [{ role: 'user', content: 'q' }]),
    ).rejects.toBeInstanceOf(ServiceUnavailableException)
  })

  it('reports a missing post as not-found rather than answering with an empty document', async () => {
    // Unreachable through HTTP (posts.service 404s first), but without it a deleted post is
    // answered as though the document were merely empty.
    retrievalMock.searchPost.mockResolvedValue([])
    prismaMock.post.findUnique.mockResolvedValue(null)

    await expect(
      service.chatWithPost('p1', [{ role: 'user', content: 'q' }]),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  describe('condensation returns a non-query shape', () => {
    const followUp = [
      { role: 'user' as const, content: 'What is an eigenvalue?' },
      { role: 'assistant' as const, content: 'A scalar.' },
      { role: 'user' as const, content: 'what about the second one?' },
    ]

    it('ignores a multi-line condensation and retrieves with the raw message', async () => {
      // Whatever comes back is embedded verbatim, so a preamble or a rationale drags every
      // similarity score down — and MIN_SIMILARITY has only 0.034 of headroom to give.
      llmMock.chat
        .mockResolvedValueOnce('Here is the standalone query:\nwhat is the second property?')
        .mockResolvedValueOnce('It is that the trace equals the sum.')

      await service.chatWithPost('p1', followUp)

      expect(retrievalMock.searchPost).toHaveBeenCalledWith(
        'p1',
        'what about the second one?',
        RETRIEVAL_TOP_K,
      )
    })

    it('ignores an oversized condensation and retrieves with the raw message', async () => {
      llmMock.chat
        .mockResolvedValueOnce('x'.repeat(400))
        .mockResolvedValueOnce('It is that the trace equals the sum.')

      await service.chatWithPost('p1', followUp)

      expect(retrievalMock.searchPost).toHaveBeenCalledWith(
        'p1',
        'what about the second one?',
        RETRIEVAL_TOP_K,
      )
    })

    it('still accepts a legitimately longer rewrite', async () => {
      // The guard must not fire on the case condensation exists for: a standalone rewrite is
      // routinely several times longer than the follow-up it replaces.
      const rewrite = 'What is the second property of eigenvalues discussed in this document?'
      llmMock.chat
        .mockResolvedValueOnce(rewrite)
        .mockResolvedValueOnce('It is that the trace equals the sum.')

      await service.chatWithPost('p1', followUp)

      expect(retrievalMock.searchPost).toHaveBeenCalledWith('p1', rewrite, RETRIEVAL_TOP_K)
    })
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
