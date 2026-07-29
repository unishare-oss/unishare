import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { readFileSync } from 'fs'
import { join } from 'path'
import { DocumentExtractorService } from './document-extractor.service'

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

  it('rejects an unsupported mime type', async () => {
    await expect(service.extractFromBuffer(Buffer.from('x'), 'image/png')).rejects.toThrow(
      'Unsupported mime type',
    )
  })
})
