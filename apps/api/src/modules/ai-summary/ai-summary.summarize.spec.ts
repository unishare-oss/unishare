import { Logger } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '@/prisma/prisma.service'
import { AiSummaryService } from './ai-summary.service'
import { TagsService } from '../tags/tags.service'
import { LlmService } from '../ai/llm/llm.service'
import { EmbeddingService } from '../ai/embedding/embedding.service'
import { RetrievalService } from '../ai/retrieval/retrieval.service'
import { DocumentExtractorService } from '../ai/extraction/document-extractor.service'
import { LlmMessage } from '../ai/llm/llm.types'
import { SUMMARY_WINDOW_CHARS } from '../ai/chunking/windows'

/** Matches the map-step system prompt without pinning its exact wording. */
const MAP_MARKER = 'one section of a longer academic document'

const isMapCall = (messages: LlmMessage[]): boolean =>
  messages[0]?.content.includes(MAP_MARKER) ?? false

const userContentOf = (messages: LlmMessage[]): string =>
  messages.find((m) => m.role === 'user')?.content ?? ''

describe('AiSummaryService.summarizePost', () => {
  let service: AiSummaryService
  let prismaMock: any
  let llmMock: any
  let extractorMock: any
  let warnSpy: jest.SpyInstance

  afterEach(() => {
    jest.restoreAllMocks()
  })

  beforeEach(async () => {
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    llmMock = { enabled: true, chat: jest.fn().mockResolvedValue('A summary.\n• point') }
    extractorMock = { extractFromKey: jest.fn() }
    prismaMock = {
      post: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'p1',
          files: [{ key: 'k.pdf', mimeType: 'application/pdf' }],
          tags: [{ tagId: 't1' }],
        }),
        update: jest.fn(),
      },
      postChunk: { findMany: jest.fn().mockResolvedValue([]) },
      tag: { findMany: jest.fn().mockResolvedValue([]) },
      postTag: { createMany: jest.fn() },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiSummaryService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: TagsService, useValue: { validateTag: () => true, findOrCreate: jest.fn() } },
        { provide: LlmService, useValue: llmMock },
        { provide: EmbeddingService, useValue: { enabled: true } },
        { provide: RetrievalService, useValue: { searchPost: jest.fn() } },
        { provide: DocumentExtractorService, useValue: extractorMock },
      ],
    }).compile()

    service = module.get(AiSummaryService)
  })

  /**
   * Returns `PARTIAL-<n>` for map calls and a fixed final summary for the reduce call, so
   * tests can assert *which* text reached the reduce step rather than only that it ran.
   */
  function useMapReduceLlm(): void {
    let mapCalls = 0
    llmMock.chat = jest.fn(async (messages: LlmMessage[]) => {
      if (isMapCall(messages)) {
        mapCalls += 1
        return `PARTIAL-${mapCalls}`
      }
      return 'FINAL SUMMARY'
    })
  }

  it('summarises from stored chunks in one call when the document fits a single window', async () => {
    prismaMock.postChunk.findMany.mockResolvedValue([
      { content: 'short chunk one' },
      { content: 'short chunk two' },
    ])

    await service.summarizePost('p1')

    expect(extractorMock.extractFromKey).not.toHaveBeenCalled()
    expect(llmMock.chat).toHaveBeenCalledTimes(1)
    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { summary: 'A summary.\n• point', summarizedAt: expect.any(Date) },
    })
  })

  it('asks for • bullets and forbids inventing document metadata', async () => {
    prismaMock.postChunk.findMany.mockResolvedValue([{ content: 'body' }])

    await service.summarizePost('p1')

    const system = llmMock.chat.mock.calls[0][0][0].content

    // apps/web/components/post-detail/post-summary.tsx parses this output literally: it keeps
    // only lines starting with '•' and does NOT render markdown. Swapping the character for
    // '-' or '*' would make every bullet vanish from the UI with no error anywhere, and that
    // coupling spans two apps with nothing else asserting the two agree.
    expect(system).toContain('•')

    // A worked example here previously caused fabrication — a textbook was summarised as
    // "Past paper for CS201 ... from the 2022 finals", inventing the course code, the year and
    // the document type. These two rules are what replaced it; losing them regresses that.
    expect(system).toMatch(/never invent a course code/i)
    expect(system).toMatch(/do not assume it is an exam/i)
  })

  it("reads only this post's chunks, keeping each file's chunks contiguous", async () => {
    prismaMock.postChunk.findMany.mockResolvedValue([
      { content: 'FILE-A-CHUNK-0' },
      { content: 'FILE-A-CHUNK-1' },
      { content: 'FILE-B-CHUNK-0' },
      { content: 'FILE-B-CHUNK-1' },
    ])

    await service.summarizePost('p1')

    // chunkIndex restarts at 0 per file, so ordering by it alone interleaves two unrelated
    // documents and every window becomes a jumble. Deep-equal on the ORDERED array: the
    // mutants this kills are `{ chunkIndex: 'asc' }` (the original bug),
    // `[{ chunkIndex: 'asc' }, { file: { createdAt: 'asc' } }]` (the plausible wrong fix —
    // still interleaves), and `[{ file: { createdAt: 'asc' } }]` (loses order within a file).
    // `select` is pinned too: dropping it would pull a 768-dim embedding per chunk into a
    // 256MB heap.
    expect(prismaMock.postChunk.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { postId: 'p1' },
        orderBy: [{ file: { createdAt: 'asc' } }, { chunkIndex: 'asc' }],
        select: { content: true, fileId: true },
      }),
    )
  })

  it('sends the stored chunk text to the LLM rather than re-extracting the file', async () => {
    prismaMock.postChunk.findMany.mockResolvedValue([
      { content: 'chunk about photosynthesis' },
      { content: 'chunk about the Calvin cycle' },
    ])
    // If the implementation ever preferred extraction, this would be the text it used.
    extractorMock.extractFromKey.mockResolvedValue({
      pages: [{ num: 1, text: 'EXTRACTED INSTEAD' }],
      hasPageNumbers: true,
    })

    await service.summarizePost('p1')

    expect(extractorMock.extractFromKey).not.toHaveBeenCalled()
    const sent = userContentOf(llmMock.chat.mock.calls[0][0])
    expect(sent).toContain('chunk about photosynthesis')
    expect(sent).toContain('chunk about the Calvin cycle')
    expect(sent).not.toContain('EXTRACTED INSTEAD')
  })

  it('maps over each window then reduces when the document exceeds one window', async () => {
    // 4 chunks x 5000 chars = 20000 -> 2 windows at the 12000 default
    prismaMock.postChunk.findMany.mockResolvedValue(
      Array.from({ length: 4 }, () => ({ content: 'x'.repeat(5000) })),
    )
    useMapReduceLlm()

    await service.summarizePost('p1')

    // 2 map calls + 1 reduce call
    expect(llmMock.chat).toHaveBeenCalledTimes(3)

    const calls: [LlmMessage[], any][] = llmMock.chat.mock.calls
    const mapMessages = calls.map(([messages]) => messages).filter(isMapCall)
    expect(mapMessages).toHaveLength(2)

    // The reduce call must run last and see the map partials, NOT the raw document text.
    const [reduceMessages] = calls[calls.length - 1]
    expect(isMapCall(reduceMessages)).toBe(false)
    expect(userContentOf(reduceMessages)).toBe('PARTIAL-1\n\nPARTIAL-2')
    expect(userContentOf(reduceMessages)).not.toContain('xxxxx')

    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { summary: 'FINAL SUMMARY', summarizedAt: expect.any(Date) },
    })
  })

  it('scales the number of map calls with the document length', async () => {
    // 8 chunks x 5000 chars = 40000 -> 4 windows
    prismaMock.postChunk.findMany.mockResolvedValue(
      Array.from({ length: 8 }, () => ({ content: 'y'.repeat(5000) })),
    )
    useMapReduceLlm()

    await service.summarizePost('p1')

    expect(llmMock.chat).toHaveBeenCalledTimes(5)
    expect(userContentOf(llmMock.chat.mock.calls[4][0])).toBe(
      'PARTIAL-1\n\nPARTIAL-2\n\nPARTIAL-3\n\nPARTIAL-4',
    )
  })

  it('still produces a summary when one window fails', async () => {
    prismaMock.postChunk.findMany.mockResolvedValue(
      Array.from({ length: 4 }, () => ({ content: 'z'.repeat(5000) })),
    )
    let mapCalls = 0
    llmMock.chat = jest.fn(async (messages: LlmMessage[]) => {
      if (isMapCall(messages)) {
        mapCalls += 1
        if (mapCalls === 1) throw new Error('provider 503')
        return `PARTIAL-${mapCalls}`
      }
      return 'FINAL SUMMARY'
    })

    await service.summarizePost('p1')

    expect(llmMock.chat).toHaveBeenCalledTimes(3)
    expect(userContentOf(llmMock.chat.mock.calls[2][0])).toBe('PARTIAL-2')
    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { summary: 'FINAL SUMMARY', summarizedAt: expect.any(Date) },
    })
  })

  it('writes nothing when every window fails', async () => {
    prismaMock.postChunk.findMany.mockResolvedValue(
      Array.from({ length: 4 }, () => ({ content: 'z'.repeat(5000) })),
    )
    llmMock.chat = jest.fn().mockRejectedValue(new Error('provider down'))

    await service.summarizePost('p1')

    expect(llmMock.chat).toHaveBeenCalledTimes(2)
    expect(prismaMock.post.update).not.toHaveBeenCalled()
  })

  it('falls back to extracting the file when no chunks exist yet', async () => {
    prismaMock.postChunk.findMany.mockResolvedValue([])
    extractorMock.extractFromKey.mockResolvedValue({
      pages: [{ num: 1, text: 'extracted body' }],
      hasPageNumbers: true,
    })

    await service.summarizePost('p1')

    expect(extractorMock.extractFromKey).toHaveBeenCalledWith('k.pdf', 'application/pdf')
    expect(userContentOf(llmMock.chat.mock.calls[0][0])).toContain('extracted body')
    expect(prismaMock.post.update).toHaveBeenCalled()
  })

  it('splits an oversized extracted page so no map call exceeds the window', async () => {
    // mammoth returns an entire .docx as ONE page, so the fallback path can hand
    // groupIntoWindows a single text far larger than the window. Unsplit, that text gets a
    // window to itself, windows.length === 1, and the whole document goes out in one call —
    // exactly the un-windowed prompt this task exists to remove.
    prismaMock.postChunk.findMany.mockResolvedValue([])
    extractorMock.extractFromKey.mockResolvedValue({
      pages: [{ num: 1, text: 'w'.repeat(SUMMARY_WINDOW_CHARS * 3) }],
      hasPageNumbers: false,
    })
    useMapReduceLlm()

    await service.summarizePost('p1')

    const calls: [LlmMessage[], any][] = llmMock.chat.mock.calls
    const mapMessages = calls.map(([messages]) => messages).filter(isMapCall)

    expect(mapMessages.length).toBeGreaterThanOrEqual(2)
    for (const messages of mapMessages) {
      expect(userContentOf(messages).length).toBeLessThanOrEqual(SUMMARY_WINDOW_CHARS)
    }
    // Nothing may be dropped on the floor by the split.
    const totalSent = mapMessages.reduce((sum, m) => sum + userContentOf(m).length, 0)
    expect(totalSent).toBeGreaterThanOrEqual(SUMMARY_WINDOW_CHARS * 3)
    expect(prismaMock.post.update).toHaveBeenCalled()
  })

  it('summarises every extracted page, not just the first', async () => {
    prismaMock.postChunk.findMany.mockResolvedValue([])
    extractorMock.extractFromKey.mockResolvedValue({
      pages: [
        { num: 1, text: 'page one topic' },
        { num: 2, text: 'page two topic' },
        { num: 3, text: 'page three topic' },
      ],
      hasPageNumbers: true,
    })

    await service.summarizePost('p1')

    const sent = userContentOf(llmMock.chat.mock.calls[0][0])
    expect(sent).toContain('page one topic')
    expect(sent).toContain('page two topic')
    expect(sent).toContain('page three topic')
  })

  it('summarises the readable files when one file fails to extract', async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: 'p1',
      files: [
        { key: 'broken.pdf', mimeType: 'application/pdf' },
        { key: 'ok.pdf', mimeType: 'application/pdf' },
        { key: 'cover.png', mimeType: 'image/png' },
      ],
      tags: [{ tagId: 't1' }],
    })
    prismaMock.postChunk.findMany.mockResolvedValue([])
    extractorMock.extractFromKey.mockImplementation(async (key: string) => {
      if (key === 'broken.pdf') throw new Error('corrupt')
      return { pages: [{ num: 1, text: 'readable body' }], hasPageNumbers: true }
    })

    await service.summarizePost('p1')

    // Unsupported mime types are never handed to the extractor.
    expect(extractorMock.extractFromKey).toHaveBeenCalledTimes(2)
    expect(userContentOf(llmMock.chat.mock.calls[0][0])).toContain('readable body')
    expect(prismaMock.post.update).toHaveBeenCalled()

    // A summary built from one of two documents is stamped summarizedAt and never retried,
    // so it must not be silently indistinguishable from a complete one.
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('broken.pdf'))
  })

  it('warns when a map window fails rather than silently shrinking the summary', async () => {
    prismaMock.postChunk.findMany.mockResolvedValue(
      Array.from({ length: 4 }, () => ({ content: 'z'.repeat(5000) })),
    )
    let mapCalls = 0
    llmMock.chat = jest.fn(async (messages: LlmMessage[]) => {
      if (isMapCall(messages)) {
        mapCalls += 1
        if (mapCalls === 1) throw new Error('provider 503')
        return `PARTIAL-${mapCalls}`
      }
      return 'FINAL SUMMARY'
    })

    await service.summarizePost('p1')

    expect(prismaMock.post.update).toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('provider 503'))
  })

  it('warns when only some of the post files have been ingested', async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: 'p1',
      files: [
        { key: 'a.pdf', mimeType: 'application/pdf' },
        { key: 'b.pdf', mimeType: 'application/pdf' },
      ],
      tags: [{ tagId: 't1' }],
    })
    // Only file A produced chunks; B is still PENDING. The chunk path short-circuits the
    // extraction fallback, so B never contributes — deliberate, but it must be visible.
    prismaMock.postChunk.findMany.mockResolvedValue([
      { content: 'file a chunk 0', fileId: 'fa' },
      { content: 'file a chunk 1', fileId: 'fa' },
    ])

    await service.summarizePost('p1')

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('1/2 files'))
    expect(prismaMock.post.update).toHaveBeenCalled()
  })

  it('does not warn about ingestion when every file has chunks', async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: 'p1',
      files: [
        { key: 'a.pdf', mimeType: 'application/pdf' },
        { key: 'b.pdf', mimeType: 'application/pdf' },
      ],
      tags: [{ tagId: 't1' }],
    })
    prismaMock.postChunk.findMany.mockResolvedValue([
      { content: 'file a chunk 0', fileId: 'fa' },
      { content: 'file b chunk 0', fileId: 'fb' },
    ])

    await service.summarizePost('p1')

    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('does nothing when there is no text at all', async () => {
    prismaMock.postChunk.findMany.mockResolvedValue([])
    extractorMock.extractFromKey.mockResolvedValue({ pages: [], hasPageNumbers: true })

    await service.summarizePost('p1')

    expect(llmMock.chat).not.toHaveBeenCalled()
    expect(prismaMock.post.update).not.toHaveBeenCalled()
  })

  it('does nothing when the post does not exist', async () => {
    prismaMock.post.findUnique.mockResolvedValue(null)

    await service.summarizePost('p1')

    expect(prismaMock.postChunk.findMany).not.toHaveBeenCalled()
    expect(llmMock.chat).not.toHaveBeenCalled()
    expect(prismaMock.post.update).not.toHaveBeenCalled()
  })

  it('does nothing when the LLM is disabled', async () => {
    llmMock.enabled = false

    await service.summarizePost('p1')

    expect(prismaMock.post.findUnique).not.toHaveBeenCalled()
    expect(llmMock.chat).not.toHaveBeenCalled()
  })

  it('skips auto-tagging when the post already has tags', async () => {
    prismaMock.postChunk.findMany.mockResolvedValue([{ content: 'body' }])

    await service.summarizePost('p1')

    // `createMany` alone is NOT enough: with the guard deleted, autoTagPost still runs and
    // dies on `tag.id` (findOrCreate is a bare jest.fn() resolving undefined) inside its own
    // try/catch, so createMany is unreached and the test passes for the wrong reason. The
    // observables that actually distinguish the branch are the tagging LLM call and the
    // existing-tag lookup that precedes it.
    expect(llmMock.chat).toHaveBeenCalledTimes(1)
    expect(prismaMock.tag.findMany).not.toHaveBeenCalled()
    expect(prismaMock.postTag.createMany).not.toHaveBeenCalled()
  })

  it('auto-tags from the whole-document summary when the post has no tags', async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: 'p1',
      files: [{ key: 'k.pdf', mimeType: 'application/pdf' }],
      tags: [],
    })
    prismaMock.postChunk.findMany.mockResolvedValue([{ content: 'body' }])
    llmMock.chat = jest
      .fn()
      .mockResolvedValueOnce('A summary.\n• point')
      .mockResolvedValueOnce('calculus, matrices')

    await service.summarizePost('p1')

    expect(userContentOf(llmMock.chat.mock.calls[1][0])).toBe('A summary.\n• point')
  })

  it('does not write a summary when the LLM returns nothing', async () => {
    prismaMock.postChunk.findMany.mockResolvedValue([{ content: 'body' }])
    llmMock.chat = jest.fn().mockResolvedValue(null)

    await service.summarizePost('p1')

    expect(prismaMock.post.update).not.toHaveBeenCalled()
  })

  it('swallows errors so a failed summary never breaks the caller', async () => {
    prismaMock.postChunk.findMany.mockRejectedValue(new Error('db down'))
    await expect(service.summarizePost('p1')).resolves.toBeUndefined()
  })
})
