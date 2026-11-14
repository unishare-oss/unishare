import { EventEmitter } from 'events'
import { Logger } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'
import { LoggerMiddleware } from './logger.middleware'

function fakeResponse() {
  const emitter = new EventEmitter() as EventEmitter & Partial<Response>
  emitter.statusCode = 200
  emitter.setHeader = jest.fn()
  return emitter as unknown as Response & EventEmitter
}

function fakeRequest(path: string) {
  return { method: 'GET', originalUrl: path, path, route: { path } } as unknown as Request
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
})
