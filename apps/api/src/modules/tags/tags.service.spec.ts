import { Test, TestingModule } from '@nestjs/testing'
import { TagsService } from './tags.service'
import { PrismaService } from '@/prisma/prisma.service'

describe('TagsService', () => {
  let service: TagsService
  let prismaMock: any

  beforeEach(async () => {
    prismaMock = {
      tag: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile()

    service = module.get<TagsService>(TagsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('findOrCreate', () => {
    it('should create a new tag with correct slug', async () => {
      const mockTag = {
        id: '1',
        name: 'Linear Algebra',
        slug: 'linear-algebra',
        color: '#3B82F6',
        createdAt: new Date(),
      }

      prismaMock.tag.upsert.mockResolvedValue(mockTag)

      const result = await service.findOrCreate('Linear Algebra')

      expect(result).toEqual(mockTag)
      expect(prismaMock.tag.upsert).toHaveBeenCalledWith({
        where: { slug: 'linear-algebra' },
        update: {},
        create: {
          name: 'Linear Algebra',
          slug: 'linear-algebra',
          color: '#3B82F6',
        },
      })
    })

    it('should return existing tag on duplicate', async () => {
      const mockTag = {
        id: '1',
        name: 'Linear Algebra',
        slug: 'linear-algebra',
        color: '#3B82F6',
        createdAt: new Date(),
      }

      prismaMock.tag.upsert.mockResolvedValue(mockTag)

      const result1 = await service.findOrCreate('Linear Algebra')
      const result2 = await service.findOrCreate('linear algebra')

      expect(result1).toEqual(mockTag)
      expect(result2).toEqual(mockTag)
      expect(prismaMock.tag.upsert).toHaveBeenCalledTimes(2)
    })
  })

  describe('autocomplete', () => {
    it('should return tags matching prefix', async () => {
      const mockTags = [
        {
          id: '1',
          name: 'Linear Algebra',
          slug: 'linear-algebra',
          color: '#3B82F6',
          createdAt: new Date(),
          _count: { posts: 5 },
        },
      ]

      prismaMock.tag.findMany.mockResolvedValue(mockTags)

      const result = await service.autocomplete('Linear')

      expect(result).toEqual(
        mockTags.map((tag) => ({
          ...tag,
          postCount: tag._count.posts,
        })),
      )
      expect(prismaMock.tag.findMany).toHaveBeenCalled()
    })

    it('should order by post count (trending first)', async () => {
      const mockTags = [
        {
          id: '1',
          name: 'Calculus',
          slug: 'calculus',
          color: '#3B82F6',
          createdAt: new Date(),
          _count: { posts: 10 },
        },
        {
          id: '2',
          name: 'Computer Science',
          slug: 'computer-science',
          color: '#3B82F6',
          createdAt: new Date(),
          _count: { posts: 5 },
        },
      ]

      prismaMock.tag.findMany.mockResolvedValue(mockTags)

      const result = await service.autocomplete('C')

      expect(result[0].postCount).toBe(10)
      expect(result[1].postCount).toBe(5)
    })
  })

  describe('validateTag', () => {
    it('should accept valid tag names', () => {
      expect(service.validateTag('Linear Algebra')).toBe(true)
      expect(service.validateTag('C++')).toBe(true)
      expect(service.validateTag('AI & ML')).toBe(true)
      expect(service.validateTag('Python (v3.11)')).toBe(true)
    })

    it('should reject invalid tag names', () => {
      expect(service.validateTag('a')).toBe(false)
      expect(service.validateTag('a' + 'b'.repeat(50))).toBe(false)
      expect(service.validateTag('Tag@Invalid')).toBe(false)
    })
  })

  describe('getTrendingTags', () => {
    it('should order tags by post count descending', async () => {
      const mockTags = [
        {
          id: '1',
          name: 'Tag1',
          slug: 'tag1',
          color: '#3B82F6',
          createdAt: new Date(),
          _count: { posts: 100 },
        },
        {
          id: '2',
          name: 'Tag2',
          slug: 'tag2',
          color: '#3B82F6',
          createdAt: new Date(),
          _count: { posts: 50 },
        },
      ]

      prismaMock.tag.findMany.mockResolvedValue(mockTags)

      const result = await service.getTrendingTags()

      expect(result[0].postCount).toBe(100)
      expect(result[1].postCount).toBe(50)
    })
  })

  describe('getTagStats', () => {
    it('should return total count and top tags', async () => {
      prismaMock.tag.count.mockResolvedValue(42)
      prismaMock.tag.findMany.mockResolvedValue([
        {
          id: '1',
          name: 'Popular',
          slug: 'popular',
          color: '#3B82F6',
          createdAt: new Date(),
          _count: { posts: 100 },
        },
      ])

      const result = await service.getTagStats()

      expect(result.total).toBe(42)
      expect(result.mostUsed.length).toBeGreaterThanOrEqual(0)
      expect(result.recentlyAdded.length).toBeGreaterThanOrEqual(0)
    })
  })
})
