import { ServiceUnavailableException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '@/prisma/prisma.service'
import { AiChatStreamEvent, AiSummaryService } from './ai-summary.service'
import { TagsService } from '../tags/tags.service'
import { LlmService } from '../ai/llm/llm.service'
import { EmbeddingService } from '../ai/embedding/embedding.service'
import { RetrievalService, MIN_SIMILARITY } from '../ai/retrieval/retrieval.service'
import { DocumentExtractorService } from '../ai/extraction/document-extractor.service'

/**
 * Streaming AI chat, asserted on THE EVENTS THE SERVICE EMITS.
 *
 * Every test here injects a stimulus (what the model emitted) and asserts on the output the
 * service produced from it. Nothing asserts on the injected string: a test that builds the
 * sentinel and then checks the sentinel cannot notice the sentinel gate being deleted.
 */

/** A fake provider stream. Records whether the consumer stopped reading early. */
function fakeStream(chunks: string[], onAbort?: () => void) {
  return async function* () {
    try {
      for (const chunk of chunks) yield chunk
    } finally {
      onAbort?.()
    }
  }
}

/** Yields `chunks`, then throws — a provider that failed part-way through generating. */
function failingStream(chunks: string[], error: Error) {
  return async function* () {
    for (const chunk of chunks) yield chunk
    throw error
  }
}

async function collect(stream: AsyncIterable<AiChatStreamEvent>): Promise<AiChatStreamEvent[]> {
  const events: AiChatStreamEvent[] = []
  for await (const event of stream) events.push(event)
  return events
}

const deltasOf = (events: AiChatStreamEvent[]) =>
  events.filter((e): e is { type: 'delta'; text: string } => e.type === 'delta')

const textOf = (events: AiChatStreamEvent[]) =>
  deltasOf(events)
    .map((e) => e.text)
    .join('')

describe('AiSummaryService.chatWithPostStream', () => {
  let service: AiSummaryService
  let llmMock: any
  let retrievalMock: any
  let extractorMock: any
  let embeddingMock: any
  let prismaMock: any

  const chunks = [
    {
      id: 'c1',
      content: 'Eigenvalues are defined as...',
      pageNum: 12,
      similarity: 0.81,
      fileId: 'f1',
      fileName: 'notes.pdf',
    },
    {
      id: 'c2',
      content: 'Worked example follows...',
      pageNum: 13,
      similarity: 0.72,
      fileId: 'f1',
      fileName: 'notes.pdf',
    },
  ]

  const ask = (question = 'What is an eigenvalue?') =>
    service.chatWithPostStream('p1', [{ role: 'user', content: question }])

  beforeEach(async () => {
    llmMock = {
      enabled: true,
      chat: jest.fn().mockResolvedValue('An eigenvalue is a scalar.'),
      chatStream: jest.fn(fakeStream(['An eigenvalue ', 'is a ', 'scalar.'])),
    }
    retrievalMock = { searchPost: jest.fn().mockResolvedValue(chunks) }
    extractorMock = { extractFromKey: jest.fn() }
    embeddingMock = { enabled: true }
    prismaMock = { post: { findUnique: jest.fn().mockResolvedValue({ files: [] }) } }

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

  describe('an ordinary answer', () => {
    it('streams the reply and terminates with done', async () => {
      const events = await collect(ask())

      expect(textOf(events)).toBe('An eigenvalue is a scalar.')
      expect(events.at(-1)).toEqual({ type: 'done', offTopic: false })
    })

    it('emits the reply incrementally rather than in one piece at the end', async () => {
      // The mutant this exists for: a gate that never flushes, or one that buffers the whole
      // reply and releases it in `end()`. Both produce byte-identical final content, so every
      // content assertion in this file passes while streaming does nothing at all.
      const events = await collect(ask())

      expect(deltasOf(events).length).toBeGreaterThan(1)
    })

    it('sends citations before the first delta, and only once', async () => {
      const events = await collect(ask())
      const citationEvents = events.filter((e) => e.type === 'citations')

      expect(citationEvents).toHaveLength(1)
      expect(events.findIndex((e) => e.type === 'citations')).toBeLessThan(
        events.findIndex((e) => e.type === 'delta'),
      )
    })

    it('cites the chunks retrieval actually returned', async () => {
      const events = await collect(ask())
      const citations = events.find((e) => e.type === 'citations')

      expect(citations).toEqual({
        type: 'citations',
        citations: [
          {
            chunkId: 'c1',
            pageNum: 12,
            fileId: 'f1',
            fileName: 'notes.pdf',
            snippet: 'Eigenvalues are defined as...',
          },
          {
            chunkId: 'c2',
            pageNum: 13,
            fileId: 'f1',
            fileName: 'notes.pdf',
            snippet: 'Worked example follows...',
          },
        ],
      })
    })

    it('passes the retrieved excerpts to the model at the streaming call site', async () => {
      await collect(ask())

      const [messages, options] = llmMock.chatStream.mock.calls[0]
      expect(messages[0].content).toContain('Eigenvalues are defined as...')
      expect(messages[0].content).toContain('[page 12]')
      expect(messages.at(-1)).toEqual({ role: 'user', content: 'What is an eigenvalue?' })
      // Streamed and one-shot answers must be the SAME answer; different settings would make
      // them differ in ways only production would reveal.
      expect(options).toEqual({ maxTokens: 600, temperature: 0.3 })
    })
  })

  describe('a refusal', () => {
    it.each([
      ['the bare sentinel', ['OFF_TOPIC']],
      ['a sentinel split across deltas', ['OFF', '_TOP', 'IC']],
      ['a decorated sentinel', ['**OFF', '_TOPIC', '**']],
      ['a sentinel with an explanation after it', ['OFF_TOPIC', ' — unrelated to this document']],
      ['a sentinel with an explanation beneath it', ['OFF_TOPIC\n', 'This document covers maths.']],
      ['a lowercase sentinel', ['off_topic.']],
    ])('never lets %s reach the client', async (_label, streamed) => {
      llmMock.chatStream = jest.fn(fakeStream(streamed))

      const events = await collect(ask('Who won the World Cup?'))

      // Asserted on what came OUT. The sentinel went in; if the gate is removed it comes out
      // here, character by character, which is the failure this whole feature had to avoid.
      expect(deltasOf(events)).toHaveLength(0)
      expect(textOf(events)).not.toContain('OFF_TOPIC')
      expect(textOf(events).toUpperCase()).not.toContain('OFF_TOPIC')
      expect(events.at(-1)).toEqual({ type: 'done', offTopic: true })
    })

    it('emits no citations event at all on a refusal', async () => {
      // Not "an empty citations event" — none. The excerpts were retrieved and explicitly not
      // used, and a sources footer under a rejection reads as evidence for it.
      llmMock.chatStream = jest.fn(fakeStream(['**OFF_TOPIC**']))

      const events = await collect(ask('Who won the World Cup?'))

      expect(events.filter((e) => e.type === 'citations')).toHaveLength(0)
      expect(events).toEqual([{ type: 'done', offTopic: true }])
    })

    it('stops consuming the provider stream once it has refused', async () => {
      // A refusal that kept reading would burn tokens on text nobody will ever see.
      const aborted = jest.fn()
      llmMock.chatStream = jest.fn(fakeStream(['OFF_TOPIC.', ' more', ' text', ' after'], aborted))

      await collect(ask('Who won the World Cup?'))

      expect(aborted).toHaveBeenCalled()
    })

    it('answers a question about the sentinel instead of refusing it', async () => {
      // The other side of the trap: a legitimate answer that mentions the token must survive.
      const streamed = ['OFF_TOPIC', ' is the marker ', 'returned for unrelated questions.']
      llmMock.chatStream = jest.fn(fakeStream(streamed))

      const events = await collect(ask('What does OFF_TOPIC mean?'))

      expect(textOf(events)).toBe(streamed.join(''))
      expect(events.at(-1)).toEqual({ type: 'done', offTopic: false })
    })
  })

  describe('failures', () => {
    it('propagates a transient provider error raised before the first token', async () => {
      // A provider that fails on the very first call yields nothing at all.
      // eslint-disable-next-line require-yield
      llmMock.chatStream = jest.fn(async function* () {
        throw new ServiceUnavailableException('The AI service is busy. Please try again shortly.')
      })

      await expect(collect(ask())).rejects.toBeInstanceOf(ServiceUnavailableException)
    })

    it('surfaces a mid-stream provider failure instead of ending the answer quietly', async () => {
      // The failure mode: a 429 fifty tokens in becomes a half-written answer that simply stops,
      // with a `done` on the end telling the client everything is fine.
      llmMock.chatStream = jest.fn(
        failingStream(
          ['An eigenvalue ', 'is a '],
          new ServiceUnavailableException('The AI service is busy. Please try again shortly.'),
        ),
      )

      const events: AiChatStreamEvent[] = []
      await expect(
        (async () => {
          for await (const event of ask()) events.push(event)
        })(),
      ).rejects.toBeInstanceOf(ServiceUnavailableException)

      expect(events.some((e) => e.type === 'done')).toBe(false)
      expect(textOf(events)).toBe('An eigenvalue is a ')
    })

    it('fails rather than emitting an empty answer when the provider yields nothing', async () => {
      // Parity with the non-streaming path's `if (!reply) throw`. An empty `done` would render
      // as a blank bubble with no explanation.
      llmMock.chatStream = jest.fn(fakeStream([]))

      await expect(collect(ask())).rejects.toBeInstanceOf(ServiceUnavailableException)
    })

    it('refuses to start when no provider is configured', async () => {
      llmMock.enabled = false

      await expect(collect(ask())).rejects.toBeInstanceOf(ServiceUnavailableException)
      expect(llmMock.chatStream).not.toHaveBeenCalled()
    })
  })

  describe('the full-text fallback', () => {
    beforeEach(() => {
      prismaMock.post.findUnique.mockResolvedValue({
        files: [{ key: 'k1', mimeType: 'application/pdf' }],
      })
      extractorMock.extractFromKey.mockResolvedValue({
        pages: [{ text: 'Chapter 1 covers eigenvalues.' }],
        hasPageNumbers: true,
      })
    })

    it('streams without citations when retrieval found nothing', async () => {
      retrievalMock.searchPost.mockResolvedValue([])

      const events = await collect(ask())

      expect(textOf(events)).toBe('An eigenvalue is a scalar.')
      expect(events.find((e) => e.type === 'citations')).toEqual({
        type: 'citations',
        citations: [],
      })
      expect(llmMock.chatStream.mock.calls[0][0][0].content).toContain(
        'Chapter 1 covers eigenvalues.',
      )
    })

    it('takes the same fallback the one-shot path takes when the best match is below the floor', async () => {
      retrievalMock.searchPost.mockResolvedValue([
        { ...chunks[0], similarity: MIN_SIMILARITY - 0.01 },
      ])

      const events = await collect(ask())

      // Full text in the prompt, and no citations — a weak match must not be cited as though it
      // had been used.
      expect(llmMock.chatStream.mock.calls[0][0][0].content).toContain(
        'Chapter 1 covers eigenvalues.',
      )
      expect(events.find((e) => e.type === 'citations')).toEqual({
        type: 'citations',
        citations: [],
      })
    })

    it('answers plainly when the document could not be read, without calling the model', async () => {
      retrievalMock.searchPost.mockResolvedValue([])
      extractorMock.extractFromKey.mockResolvedValue({ pages: [], hasPageNumbers: false })

      const events = await collect(ask())

      expect(textOf(events)).toContain("couldn't be read")
      expect(events.at(-1)).toEqual({ type: 'done', offTopic: false })
      expect(llmMock.chatStream).not.toHaveBeenCalled()
    })
  })
})
