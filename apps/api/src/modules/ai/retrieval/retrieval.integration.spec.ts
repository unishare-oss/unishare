import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ConfigModule } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '@/prisma/prisma.service'
import { RetrievalService, RETRIEVAL_TOP_K } from './retrieval.service'
import { EmbeddingService } from '../embedding/embedding.service'
import { toVectorLiteral } from '../embedding/vector-literal'
import { DocumentExtractorService } from '../extraction/document-extractor.service'
import { Chunk, chunkDocument } from '../chunking/chunker'

/**
 * Executes the real query against a live pgvector, with real embeddings from a live Ollama.
 *
 * The unit spec beside this one asserts the SQL as *text*, which is necessary but not
 * sufficient: appending `DESC`, swapping `"postId"` for `"fileId"`, turning the `AND` before
 * `embedding IS NOT NULL` into an `OR`, replacing `LIMIT` with `OFFSET`, and halving the
 * similarity scale all satisfy every one of its assertions while being badly wrong. The
 * `OR` is the dangerous one -- it drops post scoping entirely, so one user's document would
 * surface in another user's answer. None of those are visible without running the query.
 *
 * Requires a live pgvector + Ollama. Enable with RUN_DB_TESTS=1 -- the default suite must
 * never depend on live infrastructure.
 */
const describeDb = process.env.RUN_DB_TESTS === '1' ? describe : describe.skip

// Embedding 17 chunks on a CPU-only Ollama takes tens of seconds.
jest.setTimeout(300_000)

const UNIVERSITY_ID = 'ret-int-uni'
const DEPARTMENT_ID = 'ret-int-dept'
const COURSE_ID = 'ret-int-course'
const USER_ID = 'ret-int-user'
const POST_A_ID = 'ret-int-post-a'
const POST_B_ID = 'ret-int-post-b'
const FILE_A_ID = 'ret-int-file-a'
const FILE_B_ID = 'ret-int-file-b'

/**
 * Post B's content is deliberately unrelated to the fixture and deliberately matched by
 * PROBE_B, so that a query scoped to post A which nonetheless returns a B chunk is
 * unambiguous evidence of a scoping bug rather than a ranking coincidence.
 */
const POST_B_TEXT = [
  'Patagonian sand fleas coordinate their mating flights using sudden barometric pressure drops.',
  'Field observations from the 1974 Ushuaia expedition recorded swarm densities of up to four',
  'thousand individuals per cubic metre during a single afternoon squall.',
].join(' ')
const PROBE_B = 'Patagonian sand fleas mating flights barometric pressure Ushuaia swarm density'

function parseVector(literal: string): number[] {
  return literal.slice(1, -1).split(',').map(Number)
}

function cosine(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

describeDb('RetrievalService (live pgvector)', () => {
  let app: TestingModule
  let prisma: PrismaService
  let embedding: EmbeddingService
  let service: RetrievalService

  let chunksA: Chunk[]
  let idsA: string[]
  let idsB: string[]
  /** A verbatim chunk of post A, used as a query that should retrieve itself. */
  let probeA: string

  async function insertChunks(postId: string, fileId: string, chunks: Chunk[]): Promise<string[]> {
    const vectors = await embedding.embedDocuments(chunks.map((chunk) => chunk.content))

    await prisma.postChunk.createMany({
      data: chunks.map((chunk) => ({
        postId,
        fileId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        pageNum: chunk.pageNum,
      })),
    })

    // Same two-pass write IngestionService uses: Prisma cannot write Unsupported("vector").
    for (const [index, chunk] of chunks.entries()) {
      await prisma.$executeRaw`
        UPDATE post_chunk
        SET embedding = ${toVectorLiteral(vectors[index])}::vector
        WHERE "fileId" = ${fileId} AND "chunkIndex" = ${chunk.chunkIndex}
      `
    }

    const rows = await prisma.postChunk.findMany({
      where: { fileId },
      select: { id: true },
      orderBy: { chunkIndex: 'asc' },
    })
    return rows.map((row) => row.id)
  }

  /** Deleting a post cascades its files and chunks. Run before seeding too, so a crashed
   * previous run cannot make this one fail on a unique constraint. */
  async function cleanup(): Promise<void> {
    await prisma.post.deleteMany({ where: { id: { in: [POST_A_ID, POST_B_ID] } } })
    await prisma.user.deleteMany({ where: { id: USER_ID } })
    await prisma.course.deleteMany({ where: { id: COURSE_ID } })
    await prisma.department.deleteMany({ where: { id: DEPARTMENT_ID } })
    await prisma.university.deleteMany({ where: { id: UNIVERSITY_ID } })
  }

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [PrismaService, EmbeddingService, DocumentExtractorService, RetrievalService],
    }).compile()
    await app.init()

    prisma = app.get(PrismaService)
    embedding = app.get(EmbeddingService)
    service = app.get(RetrievalService)

    if (!embedding.enabled) {
      throw new Error('AI_EMBEDDING_PROVIDER is not configured; this spec needs a live embedder')
    }

    await cleanup()

    await prisma.university.create({
      data: { id: UNIVERSITY_ID, name: 'Retrieval Integration University', shortName: 'RIU' },
    })
    await prisma.department.create({
      data: { id: DEPARTMENT_ID, name: 'Retrieval Integration Department' },
    })
    await prisma.course.create({
      data: {
        id: COURSE_ID,
        code: 'RETINT101',
        name: 'Retrieval Integration',
        departmentId: DEPARTMENT_ID,
      },
    })
    await prisma.user.create({
      data: {
        id: USER_ID,
        name: 'Retrieval Integration',
        email: 'retrieval-integration@example.com',
        universityId: UNIVERSITY_ID,
        departmentId: DEPARTMENT_ID,
      },
    })

    for (const [postId, fileId, shortCode] of [
      [POST_A_ID, FILE_A_ID, 'retint-a'],
      [POST_B_ID, FILE_B_ID, 'retint-b'],
    ]) {
      await prisma.post.create({
        data: {
          id: postId,
          shortCode,
          type: 'NOTE',
          title: `Retrieval integration ${postId}`,
          authorId: USER_ID,
          courseId: COURSE_ID,
        },
      })
      await prisma.file.create({
        data: {
          id: fileId,
          key: `retrieval-integration/${fileId}.pdf`,
          name: `${fileId}.pdf`,
          size: 1,
          mimeType: 'application/pdf',
          postId,
        },
      })
    }

    // Post A: the real fixture, straight through extractFromBuffer -- no S3 involved.
    const extractor = app.get(DocumentExtractorService)
    const buffer = readFileSync(join(__dirname, '../../../../test/fixtures/sample.pdf'))
    chunksA = chunkDocument(await extractor.extractFromBuffer(buffer, 'application/pdf'))
    idsA = await insertChunks(POST_A_ID, FILE_A_ID, chunksA)
    probeA = chunksA[Math.floor(chunksA.length / 2)].content

    const chunksB = chunkDocument({ pages: [{ num: 1, text: POST_B_TEXT }], hasPageNumbers: true })
    idsB = await insertChunks(POST_B_ID, FILE_B_ID, chunksB)
  })

  afterAll(async () => {
    if (prisma) await cleanup()
    if (app) await app.close()
  })

  it('seeded enough chunks for the top-k cap to mean something', () => {
    expect(idsA.length).toBeGreaterThan(RETRIEVAL_TOP_K)
    expect(idsB.length).toBeGreaterThan(0)
  })

  it('returns only chunks belonging to the requested post', async () => {
    // Queried with text that matches post B far better than anything in post A: if scoping
    // is broken, B's chunk outranks every A chunk and shows up here.
    const rows = await service.searchPost(POST_A_ID, PROBE_B)

    // Non-empty first. A query scoped on the wrong column ("fileId" instead of "postId")
    // matches nothing at all, which would satisfy "every id belongs to A" vacuously.
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.map((row) => row.id).filter((id) => !idsA.includes(id))).toEqual([])

    // The other direction, so the test cannot pass by always returning post A.
    const rowsB = await service.searchPost(POST_B_ID, PROBE_B)
    expect(rowsB.length).toBeGreaterThan(0)
    expect(rowsB.map((row) => row.id).filter((id) => !idsB.includes(id))).toEqual([])
  })

  it('orders rows by descending similarity', async () => {
    const rows = await service.searchPost(POST_A_ID, probeA)
    expect(rows.length).toBeGreaterThan(1)

    const similarities = rows.map((row) => row.similarity)
    expect(similarities).toEqual([...similarities].sort((a, b) => b - a))
  })

  it('honours an explicit limit and caps at RETRIEVAL_TOP_K by default', async () => {
    expect(await service.searchPost(POST_A_ID, probeA, 2)).toHaveLength(2)

    const defaulted = await service.searchPost(POST_A_ID, probeA)
    expect(defaulted).toHaveLength(RETRIEVAL_TOP_K)
  })

  it('reports similarity on the cosine scale', async () => {
    // Captures the vector the service actually embedded, so the comparison below assumes
    // nothing about Ollama returning an identical vector for a repeated call.
    const spy = jest.spyOn(embedding, 'embedQuery')
    const rows = await service.searchPost(POST_A_ID, probeA)
    const queryVector = (await spy.mock.results[0].value) as number[]
    spy.mockRestore()

    for (const row of rows) {
      expect(row.similarity).toBeGreaterThan(0)
      expect(row.similarity).toBeLessThanOrEqual(1)
    }

    // The exact value, not just the range: a raw distance and a halved scale both stay
    // inside 0..1, so a range check alone proves nothing about the scale.
    const [stored] = await prisma.$queryRaw<{ vec: string }[]>`
      SELECT embedding::text AS vec FROM post_chunk WHERE id = ${rows[0].id}
    `
    expect(rows[0].similarity).toBeCloseTo(cosine(queryVector, parseVector(stored.vec)), 3)
  })

  it('ranks a chunk first when searched with its own text', async () => {
    const rows = await service.searchPost(POST_A_ID, probeA)
    expect(rows[0].content).toBe(probeA)
  })
})
