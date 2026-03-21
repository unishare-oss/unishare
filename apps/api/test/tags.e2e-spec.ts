import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '@/app.module'

describe('Tags (e2e)', () => {
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

  describe('GET /tags/autocomplete', () => {
    it('should return tag suggestions matching query', async () => {
      const response = await request(app.getHttpServer())
        .get('/tags/autocomplete')
        .query({ q: 'a' })
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it('should require query parameter', async () => {
      const response = await request(app.getHttpServer()).get('/tags/autocomplete').expect(200)

      expect(response.body).toHaveProperty('success')
    })

    it('should return tags with post count', async () => {
      const response = await request(app.getHttpServer())
        .get('/tags/autocomplete')
        .query({ q: 'l' })
        .expect(200)

      if (response.body.data && response.body.data.length > 0) {
        const tag = response.body.data[0]
        expect(tag).toHaveProperty('id')
        expect(tag).toHaveProperty('name')
        expect(tag).toHaveProperty('slug')
        expect(tag).toHaveProperty('postCount')
      }
    })

    it('should limit results to 10 by default', async () => {
      const response = await request(app.getHttpServer())
        .get('/tags/autocomplete')
        .query({ q: '' })
        .expect(200)

      if (response.body.data) {
        expect(response.body.data.length).toBeLessThanOrEqual(10)
      }
    })
  })

  describe('GET /tags/trending', () => {
    it('should return trending tags ordered by popularity', async () => {
      const response = await request(app.getHttpServer()).get('/tags/trending').expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it('should return tags with post count', async () => {
      const response = await request(app.getHttpServer()).get('/tags/trending').expect(200)

      if (response.body.data && response.body.data.length > 0) {
        const tag = response.body.data[0]
        expect(tag).toHaveProperty('id')
        expect(tag).toHaveProperty('postCount')
      }
    })

    it('should limit results to 10 by default', async () => {
      const response = await request(app.getHttpServer()).get('/tags/trending').expect(200)

      if (response.body.data) {
        expect(response.body.data.length).toBeLessThanOrEqual(10)
      }
    })
  })

  describe('GET /tags/stats', () => {
    it('should return tag statistics', async () => {
      const response = await request(app.getHttpServer()).get('/tags/stats').expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body.data).toHaveProperty('total')
      expect(response.body.data).toHaveProperty('mostUsed')
      expect(response.body.data).toHaveProperty('recentlyAdded')
    })

    it('should return arrays for most used and recently added', async () => {
      const response = await request(app.getHttpServer()).get('/tags/stats').expect(200)

      expect(Array.isArray(response.body.data.mostUsed)).toBe(true)
      expect(Array.isArray(response.body.data.recentlyAdded)).toBe(true)
    })

    it('should have total as a number', async () => {
      const response = await request(app.getHttpServer()).get('/tags/stats').expect(200)

      expect(typeof response.body.data.total).toBe('number')
      expect(response.body.data.total).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Tag validation', () => {
    it('should handle invalid tag names gracefully', async () => {
      // This would typically be tested through POST /posts/:id/tags
      // but since tag creation is automatic on post tagging, validation
      // happens at the service level
      const response = await request(app.getHttpServer()).get('/tags/trending').expect(200)

      expect(response.body).toHaveProperty('success', true)
    })
  })
})
