import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'
import { TrendingService } from '../src/modules/trending/trending.service'

describe('Trending Feed (e2e)', () => {
  let app: INestApplication
  let _prisma: PrismaService
  let _trendingService: TrendingService

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    _prisma = moduleFixture.get<PrismaService>(PrismaService)
    _trendingService = moduleFixture.get<TrendingService>(TrendingService)

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /posts/trending', () => {
    it('should return trending posts with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/posts/trending?page=1&limit=20')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('posts')
      expect(response.body.data).toHaveProperty('total')
      expect(response.body.data).toHaveProperty('page')
      expect(response.body.data).toHaveProperty('limit')
      expect(Array.isArray(response.body.data.posts)).toBe(true)
    })

    it('should exclude soft-deleted posts', async () => {
      const response = await request(app.getHttpServer()).get('/posts/trending').expect(200)

      // All posts should have publicationStatus = 'PUBLISHED'
      response.body.data.posts.forEach((post: any) => {
        expect(post.publicationStatus).toBe('PUBLISHED')
      })
    })

    it('should return posts sorted by trending score', async () => {
      const response = await request(app.getHttpServer()).get('/posts/trending?limit=5').expect(200)

      const posts = response.body.data.posts
      if (posts.length > 1) {
        // Verify descending order (allowing for ties in score)
        for (let i = 0; i < posts.length - 1; i++) {
          expect(posts[i].trendingScore).toBeGreaterThanOrEqual(posts[i + 1].trendingScore)
        }
      }
    })
  })
})
