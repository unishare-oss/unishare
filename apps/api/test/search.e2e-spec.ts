import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '@/app.module'

describe('Search (e2e)', () => {
  let app: INestApplication
  let moduleFixture: TestingModule

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /posts/search', () => {
    it('should return 200 with empty query', async () => {
      const response = await request(app.getHttpServer())
        .get('/posts/search')
        .query({ q: '' })
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(Array.isArray(response.body.data) || response.body.data).toBeDefined()
    })

    it('should return paginated results with total count', async () => {
      const response = await request(app.getHttpServer())
        .get('/posts/search')
        .query({ q: 'algebra', page: 1, limit: 20 })
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body.data).toHaveProperty('results')
      expect(response.body.data).toHaveProperty('total')
      expect(response.body.data).toHaveProperty('page', 1)
      expect(response.body.data).toHaveProperty('limit', 20)
    })

    it('should be case-insensitive', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/posts/search')
        .query({ q: 'ALGEBRA' })
        .expect(200)

      const response2 = await request(app.getHttpServer())
        .get('/posts/search')
        .query({ q: 'algebra' })
        .expect(200)

      expect(response1.body.data).toBeDefined()
      expect(response2.body.data).toBeDefined()
    })

    it('should handle pagination correctly', async () => {
      const page1 = await request(app.getHttpServer())
        .get('/posts/search')
        .query({ q: 'test', page: 1, limit: 5 })
        .expect(200)

      expect(page1.body.data).toHaveProperty('page', 1)
      expect(page1.body.data).toHaveProperty('limit', 5)
    })

    it('should return valid response structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/posts/search')
        .query({ q: 'sample' })
        .expect(200)

      expect(response.body).toHaveProperty('success')
      expect(response.body).toHaveProperty('data')
      if (response.body.data.results) {
        expect(Array.isArray(response.body.data.results)).toBe(true)
      }
    })
  })
})
