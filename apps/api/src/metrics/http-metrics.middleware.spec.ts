import { Controller, Get, HttpException, INestApplication, Res, UseGuards } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { Response } from 'express'
import { Counter, Histogram } from 'prom-client'
import request from 'supertest'
import { HttpMetricsMiddleware } from './http-metrics.middleware'

@Controller()
class FixtureController {
  @Get('items/:id')
  item() {
    return { ok: true }
  }

  @Get('denied')
  @UseGuards({ canActivate: () => false })
  denied() {}

  @Get('invalid')
  invalid() {
    throw new HttpException('Invalid request', 400)
  }

  @Get('broken')
  broken() {
    throw new Error('Unexpected failure')
  }

  @Get('stream')
  stream(@Res() res: Response) {
    res.write('one')
    res.write('two')
    res.end('three')
  }

  @Get('health')
  health() {
    return { ok: true }
  }

  @Get('metrics')
  metrics() {
    return ''
  }
}

describe('HTTP metrics at response completion', () => {
  let app: INestApplication
  let requests: Counter<string>
  let duration: Histogram<string>

  beforeEach(async () => {
    const labels = ['method', 'route', 'status_code']
    requests = new Counter({
      name: 'test_requests',
      help: 'test',
      labelNames: labels,
      registers: [],
    })
    duration = new Histogram({
      name: 'test_duration',
      help: 'test',
      labelNames: labels,
      registers: [],
    })
    const metrics = new HttpMetricsMiddleware(requests, duration)
    const module = await Test.createTestingModule({ controllers: [FixtureController] }).compile()
    app = module.createNestApplication({ logger: false })
    app.use(metrics.use.bind(metrics))
    await app.init()
  })

  afterEach(async () => app.close())

  it('records final exception and guard statuses, including unmatched requests', async () => {
    for (const [path, status] of [
      ['/items/123', 200],
      ['/denied', 403],
      ['/invalid', 400],
      ['/broken', 500],
      ['/missing/456', 404],
    ] as const) {
      await request(app.getHttpServer()).get(path).expect(status)
    }
    const values = (await requests.get()).values
    expect(values.map(({ labels }) => [labels.route, labels.status_code])).toEqual([
      ['/items/:id', '200'],
      ['/denied', '403'],
      ['/invalid', '400'],
      ['/broken', '500'],
      ['unmatched', '404'],
    ])
    expect(values.every(({ value }) => value === 1)).toBe(true)
  })

  it('records a streamed response exactly once', async () => {
    await request(app.getHttpServer()).get('/stream').expect(200, 'onetwothree')
    expect((await requests.get()).values[0].value).toBe(1)
    expect(
      (await duration.get()).values.find((v) => v.metricName === 'test_duration_count')?.value,
    ).toBe(1)
  })

  it('excludes probes and scrapes even when there is a query string', async () => {
    await request(app.getHttpServer()).get('/health?probe=true').expect(200)
    await request(app.getHttpServer()).get('/metrics').expect(200)
    expect((await requests.get()).values).toEqual([])
  })
})
