import { EventEmitter } from 'events'
import { Logger } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { NextFunction, Request, Response } from 'express'
import { LoggerMiddleware, TRACE_ID_HEADER } from './logger.middleware'

function fakeResponse() {
  const emitter = new EventEmitter() as EventEmitter & Partial<Response>
  emitter.statusCode = 200
  emitter.setHeader = jest.fn()
  return emitter as unknown as Response & EventEmitter
}

function fakeRequest(path: string) {
  return { method: 'GET', originalUrl: path, path, route: { path } } as unknown as Request
}

const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736'

function withActiveSpan() {
  return jest.spyOn(trace, 'getSpan').mockReturnValue({
    spanContext: () => ({ traceId: TRACE_ID, spanId: '00f067aa0ba902b7', traceFlags: 1 }),
  } as unknown as ReturnType<typeof trace.getSpan>)
}

describe('LoggerMiddleware', () => {
  let logSpy: jest.SpyInstance
  let next: jest.MockedFunction<NextFunction>

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
    next = jest.fn()
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  it('logs a structured object, not a pre-serialised string, when a request finishes', () => {
    const res = fakeResponse()
    new LoggerMiddleware().use(fakeRequest('/api/posts'), res, next)
    res.emit('finish')

    expect(next).toHaveBeenCalledTimes(1)
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'http.request.completed',
        method: 'GET',
        route: '/api/posts',
        status_code: 200,
      }),
    )
  })

  it.each(['/health', '/metrics'])('does not log %s', (path) => {
    const res = fakeResponse()
    new LoggerMiddleware().use(fakeRequest(path), res, next)
    res.emit('finish')

    expect(next).toHaveBeenCalledTimes(1)
    expect(logSpy).not.toHaveBeenCalled()
  })

  it('exposes the trace id as a response header, including on unlogged paths', () => {
    const spanSpy = withActiveSpan()
    for (const path of ['/api/posts', '/health']) {
      const res = fakeResponse()
      new LoggerMiddleware().use(fakeRequest(path), res, next)
      expect(res.setHeader).toHaveBeenCalledWith(TRACE_ID_HEADER, TRACE_ID)
    }
    spanSpy.mockRestore()
  })

  it('logs the internal user id once auth has attached a session', () => {
    const res = fakeResponse()
    const req = fakeRequest('/api/posts')
    new LoggerMiddleware().use(req, res, next)
    // Guards run after middleware, so the session only exists by the time the response finishes.
    Object.assign(req, { session: { user: { id: 'user_123', email: 'a@b.c' } } })
    res.emit('finish')

    const logged = logSpy.mock.calls[0][0]
    expect(logged.user_id).toBe('user_123')
    expect(JSON.stringify(logged)).not.toContain('a@b.c')
  })
})
