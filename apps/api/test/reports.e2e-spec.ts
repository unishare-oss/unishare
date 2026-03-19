import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

describe('Content Reporting (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    prisma = moduleFixture.get<PrismaService>(PrismaService)

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /posts/:id/report', () => {
    it('should create a report for a post', async () => {
      const response = await request(app.getHttpServer())
        .post('/posts/test-post-id/report')
        .send({
          reason: 'SPAM',
          comment: 'Duplicate of another post',
        })
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('id')
      expect(response.body.data.reason).toBe('SPAM')
      expect(response.body.data.status).toBe('PENDING')
    })

    it('should require authentication', async () => {
      // Without session, expect 401
      const response = await request(app.getHttpServer()).post('/posts/test-post-id/report').send({
        reason: 'SPAM',
      })

      expect(response.status).toBe(401)
    })
  })

  describe('GET /admin/reports', () => {
    it('should list reports with filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/reports?status=PENDING&limit=10')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('reports')
      expect(response.body.data).toHaveProperty('total')
      expect(Array.isArray(response.body.data.reports)).toBe(true)
    })

    it('should require authentication', async () => {
      const response = await request(app.getHttpServer()).get('/admin/reports')

      expect(response.status).toBe(401)
    })
  })

  describe('PATCH /admin/reports/:id/approve', () => {
    it('should approve a report', async () => {
      const response = await request(app.getHttpServer())
        .patch('/admin/reports/test-report-id/approve')
        .send({ reason: 'Confirmed violation' })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('id')
    })
  })

  describe('PATCH /admin/reports/:id/reject', () => {
    it('should reject a report', async () => {
      const response = await request(app.getHttpServer())
        .patch('/admin/reports/test-report-id/reject')
        .send({ reason: 'False report' })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('id')
    })
  })
})
