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

function deferred() {
  let resolve!: () => void
  let reject!: (err: Error) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  // Nothing else awaits this promise, so a rejection routed into the mock's own `await`
  // must not also surface as an unhandled rejection and fail the run.
  promise.catch(() => {})
  return { promise, resolve, reject }
}

/** Distinguishable per index, so a vector paired with the wrong chunk is detectable. */
function vectorFor(index: number): number[] {
  return Array(768).fill(index + 1)
}

/**
 * A document that chunks into exactly `count` chunks: chunkDocument never spans a page
 * boundary, so one short page yields one chunk with pageNum = its page number.
 */
function documentWithChunks(count: number) {
  return {
    pages: Array.from({ length: count }, (_, i) => ({ num: i + 1, text: `chunk ${i}` })),
    hasPageNumbers: true,
  }
}

/**
 * Stands in for EmbeddingService.embedDocuments, reproducing the one behaviour this fix
 * depends on: vectors are handed to `onBatch` batch by batch as they land, not once at the
 * end. `pauseAfterBatch` freezes the mock mid-document so a test can inspect what has been
 * persisted while ingestFile is still in flight.
 *
 * The pause is deliberately outside the `if (onBatch)` guard. It is a property of the
 * embedding timeline, not of how the caller chose to persist -- so an implementation that
 * ignores `onBatch` entirely (the original all-at-once bug) still gets frozen at the same
 * point and is still observed having written nothing.
 */
function embeddingBatches(options: { batchSize?: number; pauseAfterBatch?: number } = {}): {
  fn: jest.Mock
  paused: Promise<void>
  release: () => void
  failWith: (err: Error) => void
} {
  const batchSize = options.batchSize ?? 32
  const pauseAfterBatch = options.pauseAfterBatch
  const reached = deferred()
  const gate = deferred()

  const fn = jest.fn(
    async (
      texts: string[],
      onBatch?: (vectors: number[][], startIndex: number) => Promise<void>,
    ) => {
      const all = texts.map((_, i) => vectorFor(i))
      let emitted = 0

      for (let start = 0; start < all.length; start += batchSize) {
        const vectors = all.slice(start, start + batchSize)
        if (onBatch) await onBatch(vectors, start)
        emitted++
        if (emitted === pauseAfterBatch) {
          reached.resolve()
          await gate.promise
        }
      }

      return all
    },
  )

  return { fn, paused: reached.promise, release: gate.resolve, failWith: gate.reject }
}

describe('IngestionService', () => {
  let service: IngestionService
  let prismaMock: any
  let extractorMock: any
  let embeddingMock: any

  /** Ordered log of every side effect that touches the database, plus extraction. */
  let ops: string[]
  /** Every row handed to createMany, in the order it was written. */
  let inserted: any[]
  let rawCalls: any[][]
  let txOptions: any[]

  const file = { id: 'f1', key: 'posts/u1/a.pdf', mimeType: PDF, postId: 'p1' }

  const statuses = () =>
    prismaMock.file.updateMany.mock.calls.map((c: any[]) => c[0].data.ingestStatus)
  const lastStatusData = () => prismaMock.file.updateMany.mock.calls.at(-1)[0].data

  beforeEach(async () => {
    ops = []
    inserted = []
    rawCalls = []
    txOptions = []

    // The mock treats a createMany inside a resolved $transaction as committed and
    // therefore visible -- which is sound here only because the implementation awaits each
    // transaction before its batch handler returns. That is the property under test.
    const tx = {
      postChunk: {
        // Present so that a delete wrongly moved inside the write path is *observable* in
        // `ops` rather than blowing up on an undefined mock.
        deleteMany: jest.fn(async () => {
          ops.push('tx-delete')
          return { count: 0 }
        }),
        createMany: jest.fn(async ({ data }: any) => {
          ops.push(`create:${data.length}`)
          inserted.push(...data)
          return { count: data.length }
        }),
      },
      $executeRaw: jest.fn(async (...args: any[]) => {
        rawCalls.push(args)
        return 1
      }),
    }

    prismaMock = {
      file: {
        findUnique: jest.fn().mockResolvedValue(file),
        updateMany: jest.fn(async (args: any) => {
          ops.push(`status:${args.data.ingestStatus}`)
          return { count: 1 }
        }),
        update: jest.fn().mockRejectedValue(p2025),
        findMany: jest.fn(),
      },
      postChunk: {
        deleteMany: jest.fn(async () => {
          ops.push('delete')
          return { count: 0 }
        }),
      },
      $transaction: jest.fn(async (cb: any, options: any) => {
        txOptions.push(options)
        return cb(tx)
      }),
      __tx: tx,
    }

    extractorMock = {
      extractFromKey: jest.fn(async () => {
        ops.push('extract')
        return {
          pages: [
            { num: 1, text: 'alpha' },
            { num: 2, text: 'bravo' },
          ],
          hasPageNumbers: true,
        }
      }),
    }

    embeddingMock = {
      enabled: true,
      dimensions: 768,
      embedDocuments: embeddingBatches().fn,
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
    await service.ingestFile('f1')

    expect(ops).toEqual(['status:PROCESSING', 'extract', 'delete', 'create:2', 'status:READY'])
    expect(prismaMock.file.updateMany.mock.calls[0][0].data.ingestStartedAt).toBeInstanceOf(Date)
    expect(prismaMock.file.updateMany.mock.calls[1][0].data.ingestedAt).toBeInstanceOf(Date)
    expect(prismaMock.file.updateMany.mock.calls[1][0].data.ingestError).toBeNull()
  })

  it('embeds every chunk and persists them with their page numbers, pairing each embedding with its own chunk', async () => {
    await service.ingestFile('f1')

    expect(embeddingMock.embedDocuments.mock.calls[0][0]).toEqual(['alpha', 'bravo'])
    expect(prismaMock.postChunk.deleteMany).toHaveBeenCalledWith({ where: { fileId: 'f1' } })
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
    // distinguishable values specifically so a swap is detectable.
    expect(rawCalls).toHaveLength(2)
    expect(rawCalls[0][1]).toBe(toVectorLiteral(vectorFor(0)))
    expect(rawCalls[0][2]).toBe('f1')
    expect(rawCalls[0][3]).toBe(0)
    expect(rawCalls[1][1]).toBe(toVectorLiteral(vectorFor(1)))
    expect(rawCalls[1][3]).toBe(1)
  })

  it('makes earlier chunks queryable while the file is still PROCESSING', async () => {
    // The regression this suite exists for. Mocking the count and asserting the UI renders
    // it proves only that the UI renders what it is given; it cannot distinguish a backend
    // that reports progress from one that can only ever report 0. So: freeze the embedder
    // after its first batch and look at what the database has actually been told, while
    // ingestFile is still unresolved.
    const embed = embeddingBatches({ pauseAfterBatch: 1 })
    embeddingMock.embedDocuments = embed.fn
    extractorMock.extractFromKey.mockImplementation(async () => {
      ops.push('extract')
      return documentWithChunks(96)
    })

    const inFlight = service.ingestFile('f1')
    await embed.paused

    // getAiIndexStatus() counts post_chunk rows and reads state from ingestStatus. At this
    // instant it would report indexedChunks: 32 with state 'preparing' -- the only pairing
    // the "indexed N sections so far" notice can ever be rendered from.
    expect(inserted).toHaveLength(32)
    expect(statuses()).toEqual(['PROCESSING'])
    expect(ops).toEqual(['status:PROCESSING', 'extract', 'delete', 'create:32'])

    let settled = false
    void inFlight.then(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)

    embed.release()
    await inFlight

    expect(inserted).toHaveLength(96)
    expect(statuses()).toEqual(['PROCESSING', 'READY'])
  })

  it('writes each embedding batch in its own transaction, deleting exactly once up front', async () => {
    extractorMock.extractFromKey.mockImplementation(async () => {
      ops.push('extract')
      return documentWithChunks(96)
    })

    await service.ingestFile('f1')

    // The exact sequence, not call counts. One delete, before any write, and never again
    // (a delete per batch would wipe every batch before it). Three separate transactions,
    // so rows become visible three times rather than all at once. READY last of all.
    expect(ops).toEqual([
      'status:PROCESSING',
      'extract',
      'delete',
      'create:32',
      'create:32',
      'create:32',
      'status:READY',
    ])
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(3)
    expect(prismaMock.__tx.postChunk.deleteMany).not.toHaveBeenCalled()

    // Every chunk landed exactly once, in order, paired with its own embedding. A wrong
    // slice offset in the batch handler would keep the row count right while writing
    // duplicate indexes or shifted vectors.
    expect(inserted.map((row) => row.chunkIndex)).toEqual([...Array(96).keys()])
    expect(inserted.map((row) => row.pageNum)).toEqual([...Array(96).keys()].map((i) => i + 1))
    expect(rawCalls).toHaveLength(96)
    rawCalls.forEach((call, i) => {
      expect(call[1]).toBe(toVectorLiteral(vectorFor(i)))
      expect(call[2]).toBe('f1')
      expect(call[3]).toBe(i)
    })
  })

  it('caps rows per transaction instead of writing one oversized batch in a single transaction', async () => {
    // Guards the timeout bound locally: TRANSACTION_TIMEOUT_MS only means anything if the
    // work inside one transaction is fixed. Here the embedder hands back all 96 vectors in
    // a single callback (as it would if BATCH_SIZE were raised); ingestion must still split
    // the write. And it must not go to the other extreme of a transaction per chunk.
    embeddingMock.embedDocuments = embeddingBatches({ batchSize: 96 }).fn
    extractorMock.extractFromKey.mockImplementation(async () => {
      ops.push('extract')
      return documentWithChunks(96)
    })

    await service.ingestFile('f1')

    expect(embeddingMock.embedDocuments.mock.calls[0][0]).toHaveLength(96)
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(3)
    expect(ops.filter((op) => op.startsWith('create'))).toEqual([
      'create:32',
      'create:32',
      'create:32',
    ])
    expect(inserted.map((row) => row.chunkIndex)).toEqual([...Array(96).keys()])
    expect(txOptions.every((options) => options.timeout > 0)).toBe(true)
  })

  it('leaves partial chunks behind on failure, and the next attempt deletes them before writing', async () => {
    // This is the reasoning that makes partial progress acceptable, asserted rather than
    // assumed: a run that dies mid-document may leave rows, but no later run can ever mix
    // them into its own row set, because the delete happens before its first write.
    extractorMock.extractFromKey.mockImplementation(async () => {
      ops.push('extract')
      return documentWithChunks(64)
    })
    const embed = embeddingBatches({ pauseAfterBatch: 1 })
    embeddingMock.embedDocuments = embed.fn

    const failing = service.ingestFile('f1')
    await embed.paused
    expect(inserted).toHaveLength(32)

    embed.failWith(new Error('ollama down'))
    await failing

    expect(inserted).toHaveLength(32)
    expect(statuses().at(-1)).toBe('FAILED')
    expect(lastStatusData().ingestError).toContain('ollama down')

    const retryStart = ops.length
    embeddingMock.embedDocuments = embeddingBatches().fn
    await service.ingestFile('f1')

    const retryOps = ops.slice(retryStart)
    expect(retryOps.filter((op) => op === 'delete')).toHaveLength(1)
    expect(retryOps.indexOf('delete')).toBeLessThan(
      retryOps.findIndex((op) => op.startsWith('create')),
    )
    expect(retryOps.at(-1)).toBe('status:READY')
    expect(inserted).toHaveLength(32 + 64)
  })

  it('marks an unsupported mime type UNSUPPORTED without extracting, and performs no other status write', async () => {
    prismaMock.file.findUnique.mockResolvedValue({ ...file, mimeType: 'image/png' })

    await service.ingestFile('f1')

    expect(extractorMock.extractFromKey).not.toHaveBeenCalled()
    expect(prismaMock.postChunk.deleteMany).not.toHaveBeenCalled()
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

    expect(lastStatusData().ingestStatus).toBe('FAILED')
    expect(lastStatusData().ingestError).toContain('corrupt pdf')
  })

  it('records FAILED when embedding throws', async () => {
    embeddingMock.embedDocuments = jest.fn().mockRejectedValue(new Error('ollama down'))

    await service.ingestFile('f1')

    expect(lastStatusData().ingestStatus).toBe('FAILED')
    expect(lastStatusData().ingestError).toContain('ollama down')
  })

  it('does nothing when embeddings are disabled', async () => {
    embeddingMock.enabled = false

    await service.ingestFile('f1')

    expect(prismaMock.file.updateMany).not.toHaveBeenCalled()
    expect(extractorMock.extractFromKey).not.toHaveBeenCalled()
    expect(prismaMock.postChunk.deleteMany).not.toHaveBeenCalled()
  })

  it('clears the previous run and marks READY without inserting when the document yields no chunks', async () => {
    // The delete is unconditional on purpose: a document that used to index and now extracts
    // to nothing (a re-upload that turned into a scanned image, say) must not keep serving
    // the old run's chunks to retrieval.
    extractorMock.extractFromKey.mockImplementation(async () => {
      ops.push('extract')
      return { pages: [{ num: 1, text: '   ' }], hasPageNumbers: true }
    })

    await service.ingestFile('f1')

    expect(embeddingMock.embedDocuments).not.toHaveBeenCalled()
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
    expect(ops).toEqual(['status:PROCESSING', 'extract', 'delete', 'status:READY'])
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
