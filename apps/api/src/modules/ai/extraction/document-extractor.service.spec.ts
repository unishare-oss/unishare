import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { readFileSync } from 'fs'
import { join } from 'path'
import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import { DocumentExtractorService, stripUnstorableChars } from './document-extractor.service'

const FIXTURES = join(__dirname, '../../../../test/fixtures')

describe('DocumentExtractorService', () => {
  let service: DocumentExtractorService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentExtractorService,
        { provide: ConfigService, useValue: { get: () => undefined, getOrThrow: () => 'x' } },
      ],
    }).compile()
    service = module.get(DocumentExtractorService)
  })

  describe('extractFromBuffer — pdf', () => {
    const buffer = () => readFileSync(join(FIXTURES, 'sample.pdf'))

    it('returns one entry per page with 1-based numbering', async () => {
      const doc = await service.extractFromBuffer(buffer(), 'application/pdf')
      expect(doc.pages).toHaveLength(3)
      expect(doc.pages.map((p) => p.num)).toEqual([1, 2, 3])
      expect(doc.hasPageNumbers).toBe(true)
    })

    it('keeps each page text on its own page', async () => {
      const doc = await service.extractFromBuffer(buffer(), 'application/pdf')
      expect(doc.pages[0].text).toContain('PAGE ONE ALPHA')
      expect(doc.pages[2].text).toContain('PAGE THREE CHARLIE')
      expect(doc.pages[0].text).not.toContain('PAGE THREE CHARLIE')
    })

    it('does not truncate content — the regression this work exists to fix', async () => {
      const doc = await service.extractFromBuffer(buffer(), 'application/pdf')
      const combined = doc.pages.map((p) => p.text.trim()).join('\n\n')

      // Guard the fixture itself: if it ever shrinks below the old cap, every
      // assertion below silently stops proving anything.
      expect(combined.length).toBeGreaterThan(6_000)

      // The real catch. The old code did text.slice(0, 6000) on the joined text,
      // which dropped everything past ~page 1 of this fixture.
      expect(doc.pages).toHaveLength(3)
      expect(doc.pages[2].text).toContain('PAGE THREE CHARLIE')
      expect(combined).toContain('PAGE THREE CHARLIE')
      expect(doc.pages.every((p) => p.text.trim().length > 0)).toBe(true)
    })

    it('returns untruncated joined text — the path the old cap lived on', async () => {
      const text = await service.extractTextFromBuffer(buffer(), 'application/pdf')

      expect(text.length).toBeGreaterThan(6_000)
      expect(text).toContain('PAGE ONE ALPHA')
      expect(text).toContain('PAGE THREE CHARLIE')
    })
  })

  describe('extractFromBuffer — docx', () => {
    it('returns a single synthetic page with hasPageNumbers false', async () => {
      const buffer = readFileSync(join(FIXTURES, 'sample.docx'))
      const doc = await service.extractFromBuffer(
        buffer,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      )
      expect(doc.pages).toHaveLength(1)
      expect(doc.pages[0].num).toBe(1)
      expect(doc.pages[0].text).toContain('DOCX CONTENT DELTA')
      expect(doc.hasPageNumbers).toBe(false)
    })
  })

  /**
   * Regression: four production PDFs failed ingestion with
   * `22021 invalid byte sequence for encoding "UTF8": 0x00`.
   *
   * A NUL rejects the entire `createMany` batch, so one unmappable glyph costs a whole
   * document — it lands in FAILED and retrieval excludes it. These assert the rule directly
   * because the interesting inputs are single characters; building a PDF that emits a NUL
   * would test pdfjs, not this.
   */
  describe('stripUnstorableChars', () => {
    it('removes a NUL, the byte production actually failed on', () => {
      expect(stripUnstorableChars('eigen\u0000value')).toBe('eigenvalue')
    })

    it('leaves no NUL behind when several are present', () => {
      // A non-global replace would strip only the first and still fail the insert.
      const out = stripUnstorableChars('\u0000a\u0000b\u0000')
      expect(out).toBe('ab')
      expect(out).not.toContain('\u0000')
    })

    it('removes an unpaired high surrogate', () => {
      expect(stripUnstorableChars('a\uD800b')).toBe('ab')
    })

    it('removes an unpaired low surrogate', () => {
      expect(stripUnstorableChars('a\uDC00b')).toBe('ab')
    })

    it('KEEPS a valid surrogate pair — an emoji is storable and must survive', () => {
      // The failure this guards: a regex matching the surrogate RANGE without the pair
      // lookarounds would silently mangle every non-BMP character in the corpus.
      expect(stripUnstorableChars('a\u{1F600}b')).toBe('a\u{1F600}b')
    })

    it('keeps ordinary text byte-for-byte, including newlines and accents', () => {
      const text = 'Ünïcödé\ntext\twith\r\nwhitespace — and punctuation.'
      expect(stripUnstorableChars(text)).toBe(text)
    })

    it('keeps other C0 controls, which are storable and not ours to edit', () => {
      expect(stripUnstorableChars('a\f\vb')).toBe('a\f\vb')
    })

    it('is not left stateful by the global flag across calls', () => {
      // The regex is a module-level constant carrying /g. Used with .test()/.exec() its
      // lastIndex would persist and the second call would skip the match.
      expect(stripUnstorableChars('x\u0000y')).toBe('xy')
      expect(stripUnstorableChars('x\u0000y')).toBe('xy')
    })
  })

  /**
   * These stub the parser instead of reading a fixture, and that is the whole point.
   *
   * The obvious version — extract sample.pdf and assert no NUL comes back — PASSES with the
   * sanitiser removed entirely, because the fixture contains no NUL to begin with. It
   * asserts the right thing in a scope where it cannot fail. A real NUL needs a PDF with an
   * unmappable glyph, so inject one at the parser boundary and test the wiring instead,
   * which is the part that can actually regress.
   */
  describe('sanitisation is wired into extraction', () => {
    afterEach(() => jest.restoreAllMocks())

    it('strips NUL from pdf page text', async () => {
      jest.spyOn(PDFParse.prototype, 'getText').mockResolvedValue({
        pages: [
          { num: 1, text: 'page\u0000one' },
          { num: 2, text: 'page\u0000two' },
        ],
      } as never)

      const doc = await service.extractFromBuffer(Buffer.from('x'), 'application/pdf')

      expect(doc.pages.map((p) => p.text)).toEqual(['pageone', 'pagetwo'])
      // Page numbering must survive the mapping change that introduced the strip.
      expect(doc.pages.map((p) => p.num)).toEqual([1, 2])
      expect(doc.hasPageNumbers).toBe(true)
    })

    it('strips NUL from docx text', async () => {
      jest
        .spyOn(mammoth, 'extractRawText')
        .mockResolvedValue({ value: 'docx\u0000body', messages: [] } as never)

      const doc = await service.extractFromBuffer(
        Buffer.from('x'),
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      )

      expect(doc.pages[0].text).toBe('docxbody')
      expect(doc.pages[0].num).toBe(1)
      expect(doc.hasPageNumbers).toBe(false)
    })
  })

  it('rejects an unsupported mime type', async () => {
    await expect(service.extractFromBuffer(Buffer.from('x'), 'image/png')).rejects.toThrow(
      'Unsupported mime type',
    )
  })
})
