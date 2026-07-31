import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '@/prisma/prisma.service'
import { IngestionService } from './ingestion.service'
import { DocumentExtractorService } from '../extraction/document-extractor.service'
import { EmbeddingService } from '../embedding/embedding.service'
import { toVectorLiteral } from '../embedding/vector-literal'

const PDF = 'application/pdf'

// Shaped like a real Prisma P2025 ("Record to update not found") error, which is what
// `file.update()` throws for a row that has vanished. `file.updateMany()` never throws
// this -- it just reports `{ count: 0 }` -- which is exactly why production code must use
// it instead. The `update` mock below rejects with this by default so that if a future
// regression reintroduces a bare `.update()` call, the whole suite fails loudly instead
// of quietly passing on an unconfigured stub.
const p2025 = Object.assign(
  new Error(
    'An operation failed because it depends on one or more records that were required but not found.',
  ),
  { code: 'P2025' },
)

describe('IngestionService', () => {
  let service: IngestionService
  let prismaMock: any
  let extractorMock: any
  let embeddingMock: any

  const file = { id: 'f1', key: 'posts/u1/a.pdf', mimeType: PDF, postId: 'p1' }

  beforeEach(async () => {
    const tx = {
      postChunk: { deleteMany: jest.fn(), createMany: jest.fn() },
      $executeRaw: jest.fn(),
    }

    prismaMock = {
      file: {
        findUnique: jest.fn().mockResolvedValue(file),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockRejectedValue(p2025),
        findMany: jest.fn(),
      },
      postChunk: { deleteMany: jest.fn() },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
      __tx: tx,
    }

    extractorMock = {
      extractFromKey: jest.fn().mockResolvedValue({
        pages: [
          { num: 1, text: 'alpha' },
          { num: 2, text: 'bravo' },
        ],
        hasPageNumbers: true,
      }),
    }

    embeddingMock = {
      enabled: true,
      dimensions: 768,
      embedDocuments: jest.fn().mockResolvedValue([Array(768).fill(0.1), Array(768).fill(0.2)]),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: DocumentExtractorService, useValue: extractorMock },
        { provide: EmbeddingService, useValue: embeddingMock },
      ],
    }).compile()

    service = module.get(IngestionService)
  })

  it('marks the file PROCESSING before doing any work, then READY', async () => {
    // Tracks real invocation order rather than just the eventual order of the two
    // updateMany() calls -- an order-of-calls-only check can't tell "PROCESSING written
    // before extraction starts" apart from "PROCESSING written after extraction
    // finishes but still before READY", since both produce the same two-call array.
    const order: string[] = []
    extractorMock.extractFromKey.mockImplementation(async () => {
      order.push('extract')
      return {
        pages: [
          { num: 1, text: 'alpha' },
          { num: 2, text: 'bravo' },
        ],
        hasPageNumbers: true,
      }
    })
    prismaMock.file.updateMany.mockImplementation(async (args: any) => {
      order.push(`update:${args.data.ingestStatus}`)
      return { count: 1 }
    })

    await service.ingestFile('f1')

    expect(order).toEqual(['update:PROCESSING', 'extract', 'update:READY'])
    const statuses = prismaMock.file.updateMany.mock.calls.map((c: any[]) => c[0].data.ingestStatus)
    expect(statuses).toEqual(['PROCESSING', 'READY'])
    expect(prismaMock.file.updateMany.mock.calls[0][0].data.ingestStartedAt).toBeInstanceOf(Date)
    expect(prismaMock.file.updateMany.mock.calls[1][0].data.ingestedAt).toBeInstanceOf(Date)
    expect(prismaMock.file.updateMany.mock.calls[1][0].data.ingestError).toBeNull()
  })

  it('embeds every chunk and persists them with their page numbers, pairing each embedding with its own chunk', async () => {
    await service.ingestFile('f1')

    expect(embeddingMock.embedDocuments).toHaveBeenCalledWith(['alpha', 'bravo'])
    expect(prismaMock.__tx.postChunk.deleteMany).toHaveBeenCalledWith({
      where: { fileId: 'f1' },
    })
    expect(prismaMock.__tx.postChunk.createMany).toHaveBeenCalledWith({
      data: [
        { postId: 'p1', fileId: 'f1', chunkIndex: 0, content: 'alpha', pageNum: 1 },
        { postId: 'p1', fileId: 'f1', chunkIndex: 1, content: 'bravo', pageNum: 2 },
      ],
    })

    // Call count alone can't catch a chunkIndex/vector mismatch -- e.g. every UPDATE
    // wrongly keyed to chunkIndex 0 and always writing vectors[0] still produces exactly
    // two $executeRaw calls. Assert the actual bound values per call instead: the vector
    // literal for chunk i must come from vectors[i], and the WHERE clause's chunkIndex
    // must match chunk i's real chunkIndex. The two mocked vectors are filled with
    // distinguishable values (0.1 vs 0.2) specifically so a swap is detectable.
    const rawCalls = prismaMock.__tx.$executeRaw.mock.calls
    expect(rawCalls).toHaveLength(2)
    expect(rawCalls[0][1]).toBe(toVectorLiteral(Array(768).fill(0.1)))
    expect(rawCalls[0][3]).toBe(0)
    expect(rawCalls[1][1]).toBe(toVectorLiteral(Array(768).fill(0.2)))
    expect(rawCalls[1][3]).toBe(1)
  })

  it('marks an unsupported mime type UNSUPPORTED without extracting, and performs no other status write', async () => {
    prismaMock.file.findUnique.mockResolvedValue({ ...file, mimeType: 'image/png' })

    await service.ingestFile('f1')

    expect(extractorMock.extractFromKey).not.toHaveBeenCalled()
    // toHaveBeenCalledTimes(1) is load-bearing here: toHaveBeenCalledWith alone would
    // still pass if an extra (wasteful, or worse, wrong-order) PROCESSING write happened
    // either before or after the UNSUPPORTED one.
    expect(prismaMock.file.updateMany).toHaveBeenCalledTimes(1)
    expect(prismaMock.file.updateMany).toHaveBeenCalledWith({
      where: { id: 'f1' },
      data: { ingestStatus: 'UNSUPPORTED' },
    })
  })

  it('records FAILED with the error message when extraction throws', async () => {
    extractorMock.extractFromKey.mockRejectedValue(new Error('corrupt pdf'))

    await service.ingestFile('f1')

    const last = prismaMock.file.updateMany.mock.calls.at(-1)[0]
    expect(last.data.ingestStatus).toBe('FAILED')
    expect(last.data.ingestError).toContain('corrupt pdf')
  })

  it('records FAILED when embedding throws', async () => {
    embeddingMock.embedDocuments.mockRejectedValue(new Error('ollama down'))

    await service.ingestFile('f1')

    const last = prismaMock.file.updateMany.mock.calls.at(-1)[0]
    expect(last.data.ingestStatus).toBe('FAILED')
    expect(last.data.ingestError).toContain('ollama down')
  })

  it('does nothing when embeddings are disabled', async () => {
    embeddingMock.enabled = false

    await service.ingestFile('f1')

    expect(prismaMock.file.updateMany).not.toHaveBeenCalled()
    expect(extractorMock.extractFromKey).not.toHaveBeenCalled()
  })

  it('marks READY without inserting when the document yields no chunks', async () => {
    extractorMock.extractFromKey.mockResolvedValue({
      pages: [{ num: 1, text: '   ' }],
      hasPageNumbers: true,
    })

    await service.ingestFile('f1')

    expect(embeddingMock.embedDocuments).not.toHaveBeenCalled()
    expect(prismaMock.file.updateMany.mock.calls.at(-1)[0].data.ingestStatus).toBe('READY')
  })

  it('silently returns when the file no longer exists', async () => {
    prismaMock.file.findUnique.mockResolvedValue(null)
    await expect(service.ingestFile('gone')).resolves.toBeUndefined()
    expect(prismaMock.file.updateMany).not.toHaveBeenCalled()
  })

  it('resolves without throwing when the file row vanishes mid-ingestion', async () => {
    // Simulates FilesService.remove() hard-deleting the file (or a cascade from a
    // deleted post) after ingestFile already looked it up via findUnique, but before
    // ingestion finishes -- e.g. the owner deletes the file seconds after upload while
    // it's still being embedded. updateMany reports { count: 0 } for a missing row
    // instead of throwing P2025, so ingestFile must resolve cleanly regardless of which
    // status write (PROCESSING/READY/FAILED/UNSUPPORTED) hits the vanished row.
    prismaMock.file.updateMany.mockResolvedValue({ count: 0 })

    await expect(service.ingestFile('f1')).resolves.toBeUndefined()
  })

  it('ingestPost ingests every file on the post in order', async () => {
    prismaMock.file.findMany.mockResolvedValue([{ id: 'f1' }, { id: 'f2' }])
    const spy = jest.spyOn(service, 'ingestFile').mockResolvedValue()

    await service.ingestPost('p1')

    expect(spy).toHaveBeenNthCalledWith(1, 'f1')
    expect(spy).toHaveBeenNthCalledWith(2, 'f2')
  })

  it('ingestPost continues to the next file when one rejects, and resolves rather than rejecting', async () => {
    // ingestFile already recovers from its own internal failures by writing FAILED --
    // this covers what's left over: a rejection escaping ingestFile entirely (e.g. the
    // same kind of connection blip that can hit its own findUnique or catch-block write).
    // One bad file must not abort files after it in the same post, and must not reject
    // ingestPost into a caller that may be no more careful about awaiting it than
    // FilesService is.
    prismaMock.file.findMany.mockResolvedValue([{ id: 'f1' }, { id: 'f2' }])
    const spy = jest
      .spyOn(service, 'ingestFile')
      .mockRejectedValueOnce(new Error('connection dropped'))
      .mockResolvedValueOnce(undefined)

    await expect(service.ingestPost('p1')).resolves.toBeUndefined()

    expect(spy).toHaveBeenNthCalledWith(1, 'f1')
    expect(spy).toHaveBeenNthCalledWith(2, 'f2')
  })
})
