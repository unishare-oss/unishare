import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { CoursesService } from './courses.service'
import { CoursesRepository } from './courses.repository'
import { AiSummaryService } from '@/modules/ai-summary/ai-summary.service'
import { StorageService } from '@/modules/storage/storage.service'

describe('CoursesService — outline', () => {
  let service: CoursesService
  let repo: {
    findById: jest.Mock
    findOutline: jest.Mock
    replaceOutline: jest.Mock
  }
  let aiSummary: { extractTextFromBuffer: jest.Mock; extractCourseOutline: jest.Mock }
  let storageService: { getObjectBuffer: jest.Mock }

  beforeEach(async () => {
    repo = {
      findById: jest.fn().mockResolvedValue({ id: 'c1', code: 'CS101', name: 'Intro to CS' }),
      findOutline: jest.fn(),
      replaceOutline: jest.fn(),
    }
    aiSummary = { extractTextFromBuffer: jest.fn(), extractCourseOutline: jest.fn() }
    storageService = { getObjectBuffer: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: CoursesRepository, useValue: repo },
        { provide: AiSummaryService, useValue: aiSummary },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile()

    service = module.get(CoursesService)
  })

  describe('getOutline / replaceOutline', () => {
    it('404s when the course does not exist', async () => {
      repo.findById.mockResolvedValue(null)
      await expect(service.getOutline('missing')).rejects.toThrow('Course not found')
    })

    it('replaces the outline and returns the new set', async () => {
      const modules = [{ moduleNumber: 1, topics: ['a', 'b'] }]
      repo.findOutline.mockResolvedValue(modules)

      const result = await service.replaceOutline('c1', modules)

      expect(repo.replaceOutline).toHaveBeenCalledWith('c1', modules)
      expect(result).toEqual(modules)
    })
  })

  describe('extractOutlineFromFile', () => {
    it('rejects unsupported mime types before touching storage', async () => {
      await expect(service.extractOutlineFromFile('c1', 'key', 'application/zip')).rejects.toThrow(
        BadRequestException,
      )
      expect(storageService.getObjectBuffer).not.toHaveBeenCalled()
    })

    it('rejects when the file has no extractable text', async () => {
      storageService.getObjectBuffer.mockResolvedValue(Buffer.from('irrelevant'))
      aiSummary.extractTextFromBuffer.mockResolvedValue('   ')

      await expect(service.extractOutlineFromFile('c1', 'key', 'application/pdf')).rejects.toThrow(
        'Could not extract text from the uploaded file',
      )
      expect(aiSummary.extractCourseOutline).not.toHaveBeenCalled()
    })

    it('returns the AI-extracted modules without persisting them', async () => {
      storageService.getObjectBuffer.mockResolvedValue(Buffer.from('syllabus bytes'))
      aiSummary.extractTextFromBuffer.mockResolvedValue('Module 1: Intro...')
      const extracted = [{ moduleNumber: 1, topics: ['Intro'] }]
      aiSummary.extractCourseOutline.mockResolvedValue(extracted)

      const result = await service.extractOutlineFromFile('c1', 'key', 'application/pdf')

      expect(result).toEqual(extracted)
      expect(repo.replaceOutline).not.toHaveBeenCalled()
    })
  })
})
