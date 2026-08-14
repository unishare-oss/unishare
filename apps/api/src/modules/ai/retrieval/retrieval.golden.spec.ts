import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ConfigModule } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '@/prisma/prisma.service'
import { MIN_SIMILARITY, RetrievalService } from './retrieval.service'
import { EmbeddingService } from '../embedding/embedding.service'
import { toVectorLiteral } from '../embedding/vector-literal'
import { DocumentExtractorService } from '../extraction/document-extractor.service'
import { Chunk, chunkDocument } from '../chunking/chunker'

/**
 * Golden-set retrieval eval (Task 10). Ingests test/fixtures/golden/document.pdf through the
 * REAL pipeline — pdfjs extraction, the production chunker, live nomic-embed-text embeddings —
 * and then measures what `searchPost` actually ranks, so `MIN_SIMILARITY` is a measurement
 * rather than a guess.
 *
 * Requires a live pgvector + Ollama, so the measuring half is opt-in (RUN_GOLDEN_EVAL=1).
 *
 * WARNING: the opt-in half WRITES to whatever DATABASE_URL points at — a university,
 * department, course, user, post, file and ~18 chunks, all under `golden-eval-*` ids, removed
 * again in afterAll. Nothing here checks the target is not production.
 */
const GOLDEN = join(__dirname, '../../../../test/fixtures/golden')

interface GoldenQuestions {
  onTopic: { question: string; expectedPages: number[] }[]
  offTopic: string[]
}

const questions = JSON.parse(
  readFileSync(join(GOLDEN, 'questions.json'), 'utf8'),
) as GoldenQuestions

/** The fixture is 18 pages; see test/fixtures/golden/README.md for the page/topic table. */
const FIXTURE_PAGES = 18

/**
 * The bounds actually observed by the opt-in eval below on 2026-08-14, against
 * nomic-embed-text at CHUNK_MAX_CHARS = 2000 (18 chunks, one per page).
 *
 * Recorded here rather than only printed so the default suite — which has no Ollama and no
 * Postgres — can still fail if someone edits MIN_SIMILARITY without re-running the eval. The
 * opt-in eval re-measures these against reality and fails if the gap itself has moved, so the
 * two halves pin each other: neither the constant nor these bounds can drift alone.
 */
const MEASURED_HIGHEST_OFF_TOPIC = 0.641
const MEASURED_LOWEST_ON_TOPIC = 0.675

/**
 * Hit rates observed on the same run. Recorded for the same reason as the bounds: the 0.8/0.6
 * floors asserted below are the plan's quality *contract*, and at 10 questions they carry two
 * questions of slack — 8/10 satisfies both — so a one- or two-entry mistake in
 * questions.json's expectedPages is invisible to them. These pin what was actually measured,
 * so a stale mapping fails instead of being absorbed by the slack.
 *
 * Re-transcribe after re-running the eval; do not lower to make a regression pass.
 */
const MEASURED_TOP1 = 1
const MEASURED_TOP3 = 1

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function describeDistribution(label: string, values: number[]): string {
  return (
    `${label.padEnd(9)} n=${values.length}  min=${Math.min(...values).toFixed(3)}  ` +
    `median=${median(values).toFixed(3)}  max=${Math.max(...values).toFixed(3)}`
  )
}

/**
 * Runs with no infrastructure, on every `pnpm --filter api test`. A calibrated constant with
 * nothing guarding it drifts: this is the half that notices.
 */
describe('MIN_SIMILARITY calibration (no infrastructure)', () => {
  it('sits strictly inside the gap measured by the golden eval', () => {
    // Not a tautology against the service: the numbers on the right are the observed
    // measurement, transcribed by hand. Editing MIN_SIMILARITY back to a guessed 0.5, or up
    // to a "safer" 0.7, fails here — and the fix is to re-run RUN_GOLDEN_EVAL=1 and update
    // both, not to widen these bounds.
    expect(MIN_SIMILARITY).toBeGreaterThan(MEASURED_HIGHEST_OFF_TOPIC)
    expect(MIN_SIMILARITY).toBeLessThan(MEASURED_LOWEST_ON_TOPIC)
  })

  it('was calibrated against a gap that exists at all', () => {
    // If a future re-measurement finds the bands overlapping, this fails rather than letting
    // a threshold be recorded inside an interval that runs backwards. The documented response
    // is MIN_SIMILARITY = 0 plus the model-emitted OFF_TOPIC sentinel as the only check.
    expect(MEASURED_LOWEST_ON_TOPIC).toBeGreaterThan(MEASURED_HIGHEST_OFF_TOPIC)
  })

  it('has a question set whose expected pages exist in the fixture', () => {
    // Cheap, infra-free staleness check on the mapping the eval scores against. It cannot
    // tell page 8 from page 9 — only the live eval can — but it does catch a question set
    // re-authored against a different, longer document.
    expect(questions.onTopic).toHaveLength(10)
    expect(questions.offTopic).toHaveLength(3)

    for (const item of questions.onTopic) {
      expect(item.expectedPages.length).toBeGreaterThan(0)
      for (const page of item.expectedPages) {
        expect(page).toBeGreaterThanOrEqual(1)
        expect(page).toBeLessThanOrEqual(FIXTURE_PAGES)
      }
    }
  })
})

const describeGolden = process.env.RUN_GOLDEN_EVAL === '1' ? describe : describe.skip

// Embedding 18 chunks plus 13 queries on a CPU-only Ollama takes minutes.
jest.setTimeout(600_000)

const UNIVERSITY_ID = 'golden-eval-uni'
const DEPARTMENT_ID = 'golden-eval-dept'
const COURSE_ID = 'golden-eval-course'
const USER_ID = 'golden-eval-user'
const POST_ID = 'golden-eval-post'
const FILE_ID = 'golden-eval-file'

interface QuestionResult {
  question: string
  expectedPages: number[]
  pages: (number | null)[]
  top1: boolean
  top3: boolean
  best: number
}

describeGolden('retrieval golden set (live pgvector + Ollama)', () => {
  let app: TestingModule
  let prisma: PrismaService
  let retrieval: RetrievalService

  let chunks: Chunk[]
  let onTopic: QuestionResult[]
  let offTopic: { question: string; best: number; page: number | null }[]

  /** Deleting the post cascades its file and chunks. Run before seeding too, so a crashed
   * previous run cannot fail this one on a unique constraint. */
  async function cleanup(): Promise<void> {
    await prisma.post.deleteMany({ where: { id: POST_ID } })
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
    retrieval = app.get(RetrievalService)
    const embedding = app.get(EmbeddingService)
    const extractor = app.get(DocumentExtractorService)

    if (!embedding.enabled) {
      throw new Error('AI_EMBEDDING_PROVIDER is not configured; this eval needs a live embedder')
    }

    await cleanup()

    await prisma.university.create({
      data: { id: UNIVERSITY_ID, name: 'Golden Eval University', shortName: 'GEU' },
    })
    await prisma.department.create({
      data: { id: DEPARTMENT_ID, name: 'Golden Eval Department' },
    })
    await prisma.course.create({
      data: {
        id: COURSE_ID,
        code: 'GOLDEN101',
        name: 'Golden Eval Linear Algebra',
        departmentId: DEPARTMENT_ID,
      },
    })
    await prisma.user.create({
      data: {
        id: USER_ID,
        name: 'Golden Eval',
        email: 'golden-eval@example.com',
        universityId: UNIVERSITY_ID,
        departmentId: DEPARTMENT_ID,
      },
    })
    await prisma.post.create({
      data: {
        id: POST_ID,
        shortCode: 'golden-eval',
        type: 'NOTE',
        title: 'golden-eval fixture',
        authorId: USER_ID,
        courseId: COURSE_ID,
      },
    })
    await prisma.file.create({
      data: {
        id: FILE_ID,
        postId: POST_ID,
        key: 'golden-eval/document.pdf',
        name: 'document.pdf',
        size: 1,
        mimeType: 'application/pdf',
        // File.ingestStatus defaults to PENDING and searchPost only returns chunks whose
        // owning file is READY. Without this every measurement below is taken over an empty
        // result set: 0% hit rate and a 0.0 similarity for every question, on-topic and
        // off-topic alike, which looks like a retrieval catastrophe rather than a seed bug.
        ingestStatus: 'READY',
      },
    })

    // Straight from disk through the real extractor and the real chunker — no S3.
    const buffer = readFileSync(join(GOLDEN, 'document.pdf'))
    const doc = await extractor.extractFromBuffer(buffer, 'application/pdf')
    chunks = chunkDocument(doc)

    // Guard the fixture before trusting anything measured against it. A document that
    // silently extracted as 2 pages would make every "found the right page" assertion
    // meaningless while still passing.
    if (doc.pages.length !== FIXTURE_PAGES) {
      throw new Error(
        `golden fixture extracted ${doc.pages.length} pages; expected ${FIXTURE_PAGES}. ` +
          'questions.json maps 1-based page numbers onto THAT document, so retrieval results ' +
          'measured against this one would be meaningless.',
      )
    }
    if (chunks.length < doc.pages.length) {
      throw new Error(`only ${chunks.length} chunks from ${doc.pages.length} pages`)
    }

    // embedDocuments applies the `search_document: ` prefix, embedQuery (inside searchPost)
    // applies `search_query: `. Both sides go through the real service, so the eval measures
    // the prefix pairing production uses rather than a hand-rolled one.
    const vectors = await embedding.embedDocuments(chunks.map((chunk) => chunk.content))

    await prisma.postChunk.createMany({
      data: chunks.map((chunk) => ({
        postId: POST_ID,
        fileId: FILE_ID,
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
        WHERE "fileId" = ${FILE_ID} AND "chunkIndex" = ${chunk.chunkIndex}
      `
    }

    console.log(`\nIngested ${chunks.length} chunks across ${doc.pages.length} pages`)

    // Measured once, in one place, so the hit-rate test and the separation test below cannot
    // disagree about what was observed on this run.
    onTopic = []
    for (const item of questions.onTopic) {
      const rows = await retrieval.searchPost(POST_ID, item.question)
      const pages = rows.map((row) => row.pageNum)
      onTopic.push({
        question: item.question,
        expectedPages: item.expectedPages,
        pages,
        top1: item.expectedPages.includes(pages[0] as number),
        top3: item.expectedPages.some((page) => pages.slice(0, 3).includes(page)),
        best: rows[0]?.similarity ?? 0,
      })
    }

    offTopic = []
    for (const question of questions.offTopic) {
      const rows = await retrieval.searchPost(POST_ID, question)
      offTopic.push({ question, best: rows[0]?.similarity ?? 0, page: rows[0]?.pageNum ?? null })
    }
  })

  afterAll(async () => {
    if (prisma) await cleanup()
    if (app) await app.close()
  })

  it('seeded roughly one chunk per page, so a page-level hit is meaningful', () => {
    expect(chunks.length).toBeGreaterThanOrEqual(FIXTURE_PAGES)
    // Guards the top-1/top-3 reasoning: if chunking collapsed 18 pages into 7 chunks, a
    // top-3 hit would be a coin flip and the thresholds below would stop measuring ranking.
    expect(new Set(chunks.map((chunk) => chunk.pageNum)).size).toBe(FIXTURE_PAGES)
  })

  it('ranks the expected page first for most questions', () => {
    // Printed so a human reads the individual failures, not just the ratio.
    for (const result of onTopic) {
      console.log(
        `${result.top1 ? 'TOP1' : result.top3 ? 'top3' : 'MISS'} ` +
          `best=${result.best.toFixed(3)} want=[${result.expectedPages.join(',')}] ` +
          `got=[${result.pages.join(',')}] ${result.question}`,
      )
    }

    const top1 = onTopic.filter((result) => result.top1).length / onTopic.length
    const top3 = onTopic.filter((result) => result.top3).length / onTopic.length
    console.log(`\ntop-1: ${(top1 * 100).toFixed(0)}%   top-3: ${(top3 * 100).toFixed(0)}%`)

    // Deliberately top-1 and top-3, NOT "somewhere in the top-6".
    //
    // The fixture yields one chunk per page, so with 18 chunks a top-6 hit is a 1-in-3 coin
    // flip — an 80% top-6 threshold would be satisfied by near-random ranking and would tell
    // us nothing. Top-1 has a ~6% random baseline on this corpus, so it measures ranking.
    //
    // Retrieval still SERVES top-6 in production (RETRIEVAL_TOP_K); this is a stricter
    // measurement of the same result set, not a change to what chat receives.
    expect(top3).toBeGreaterThanOrEqual(0.8)
    expect(top1).toBeGreaterThanOrEqual(0.6)

    // And no regression against what was actually measured. Deliberately tighter than the
    // contract floors: those have two questions of slack at n=10, which is enough to hide a
    // stale expectedPages entry. Against a pinned model this adds no flakiness the
    // toBeCloseTo bounds below do not already carry.
    expect(top1).toBeGreaterThanOrEqual(MEASURED_TOP1)
    expect(top3).toBeGreaterThanOrEqual(MEASURED_TOP3)
  })

  it('reports the similarity separation MIN_SIMILARITY was calibrated inside', () => {
    const onTopicBest = onTopic.map((result) => result.best)
    const offTopicBest = offTopic.map((result) => result.best)

    // Per off-topic question, not just the aggregate: with only three of them, the band's
    // ceiling IS one specific question, and which one it is decides whether the ceiling is a
    // property of the corpus or of one badly-chosen probe.
    for (const result of offTopic) {
      console.log(`OFF  best=${result.best.toFixed(3)} page=${result.page} ${result.question}`)
    }

    // min/median/max, not just the means: the whole question is whether the two bands touch,
    // and two distributions with a comfortable gap between their means can still overlap at
    // the edges that actually decide a refusal.
    console.log(`\n${describeDistribution('on-topic', onTopicBest)}`)
    console.log(describeDistribution('off-topic', offTopicBest))

    const lowestOnTopic = Math.min(...onTopicBest)
    const highestOffTopic = Math.max(...offTopicBest)
    console.log(
      `\ngap: ${highestOffTopic.toFixed(3)} .. ${lowestOnTopic.toFixed(3)}  ` +
        `(width ${(lowestOnTopic - highestOffTopic).toFixed(3)}), MIN_SIMILARITY=${MIN_SIMILARITY}`,
    )

    // The bands must not overlap, or no threshold can separate them and the similarity-based
    // off-topic check is not viable for this corpus. See README.md's limitation note: authored
    // prose with no OCR noise makes this gap wider than a real upload's would be.
    expect(lowestOnTopic).toBeGreaterThan(highestOffTopic)

    // The constant, re-validated against THIS run rather than against the transcribed numbers
    // in the default-suite guard above. Changing the embedding model, the chunk size or the
    // fixture moves the gap; if it moves out from under MIN_SIMILARITY, this fails here
    // instead of quietly refusing real questions in Task 11's chat.
    expect(MIN_SIMILARITY).toBeGreaterThan(highestOffTopic)
    expect(MIN_SIMILARITY).toBeLessThan(lowestOnTopic)

    // And the transcribed bounds still describe reality, so the infra-free guard above keeps
    // guarding something true.
    expect(highestOffTopic).toBeCloseTo(MEASURED_HIGHEST_OFF_TOPIC, 2)
    expect(lowestOnTopic).toBeCloseTo(MEASURED_LOWEST_ON_TOPIC, 2)
  })
})
