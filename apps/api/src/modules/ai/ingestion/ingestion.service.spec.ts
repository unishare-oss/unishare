import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '@/prisma/prisma.service'
import { IngestionService } from './ingestion.service'
import { DocumentExtractorService } from '../extraction/document-extractor.service'
import { EmbeddingService } from '../embedding/embedding.service'

const PDF = 'application/pdf'

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
        update: jest.fn(),
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
    // update() calls -- an order-of-calls-only check can't tell "PROCESSING written
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
    prismaMock.file.update.mockImplementation(async (args: any) => {
      order.push(`update:${args.data.ingestStatus}`)
    })

    await service.ingestFile('f1')

    expect(order).toEqual(['update:PROCESSING', 'extract', 'update:READY'])
    const statuses = prismaMock.file.update.mock.calls.map((c: any[]) => c[0].data.ingestStatus)
    expect(statuses).toEqual(['PROCESSING', 'READY'])
    expect(prismaMock.file.update.mock.calls[0][0].data.ingestStartedAt).toBeInstanceOf(Date)
    expect(prismaMock.file.update.mock.calls[1][0].data.ingestedAt).toBeInstanceOf(Date)
    expect(prismaMock.file.update.mock.calls[1][0].data.ingestError).toBeNull()
  })

  it('embeds every chunk and persists them with their page numbers', async () => {
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
    expect(prismaMock.__tx.$executeRaw).toHaveBeenCalledTimes(2)
  })

  it('marks an unsupported mime type UNSUPPORTED without extracting', async () => {
    prismaMock.file.findUnique.mockResolvedValue({ ...file, mimeType: 'image/png' })

    await service.ingestFile('f1')

    expect(extractorMock.extractFromKey).not.toHaveBeenCalled()
    expect(prismaMock.file.update).toHaveBeenCalledWith({
      where: { id: 'f1' },
      data: { ingestStatus: 'UNSUPPORTED' },
    })
  })

  it('records FAILED with the error message when extraction throws', async () => {
    extractorMock.extractFromKey.mockRejectedValue(new Error('corrupt pdf'))

    await service.ingestFile('f1')

    const last = prismaMock.file.update.mock.calls.at(-1)[0]
    expect(last.data.ingestStatus).toBe('FAILED')
    expect(last.data.ingestError).toContain('corrupt pdf')
  })

  it('records FAILED when embedding throws', async () => {
    embeddingMock.embedDocuments.mockRejectedValue(new Error('ollama down'))

    await service.ingestFile('f1')

    const last = prismaMock.file.update.mock.calls.at(-1)[0]
    expect(last.data.ingestStatus).toBe('FAILED')
    expect(last.data.ingestError).toContain('ollama down')
  })

  it('does nothing when embeddings are disabled', async () => {
    embeddingMock.enabled = false

    await service.ingestFile('f1')

    expect(prismaMock.file.update).not.toHaveBeenCalled()
    expect(extractorMock.extractFromKey).not.toHaveBeenCalled()
  })

  it('marks READY without inserting when the document yields no chunks', async () => {
    extractorMock.extractFromKey.mockResolvedValue({
      pages: [{ num: 1, text: '   ' }],
      hasPageNumbers: true,
    })

    await service.ingestFile('f1')

    expect(embeddingMock.embedDocuments).not.toHaveBeenCalled()
    expect(prismaMock.file.update.mock.calls.at(-1)[0].data.ingestStatus).toBe('READY')
  })

  it('silently returns when the file no longer exists', async () => {
    prismaMock.file.findUnique.mockResolvedValue(null)
    await expect(service.ingestFile('gone')).resolves.toBeUndefined()
    expect(prismaMock.file.update).not.toHaveBeenCalled()
  })

  it('ingestPost ingests every file on the post in order', async () => {
    prismaMock.file.findMany.mockResolvedValue([{ id: 'f1' }, { id: 'f2' }])
    const spy = jest.spyOn(service, 'ingestFile').mockResolvedValue()

    await service.ingestPost('p1')

    expect(spy).toHaveBeenNthCalledWith(1, 'f1')
    expect(spy).toHaveBeenNthCalledWith(2, 'f2')
  })
})
