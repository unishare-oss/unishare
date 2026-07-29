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
      const total = doc.pages.reduce((sum, p) => sum + p.text.length, 0)
      expect(total).toBeGreaterThan(0)
      // Every page must survive. The old implementation sliced the joined text to
      // 6000 chars, which silently dropped trailing pages on real documents.
      expect(doc.pages.every((p) => p.text.trim().length > 0)).toBe(true)
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
