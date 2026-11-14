import { ArgumentsHost, Logger, NotFoundException } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { HttpExceptionFilter } from './http-exception.filter'

function fakeHost() {
  const json = jest.fn()
  const response = { status: jest.fn().mockReturnValue({ json }) }
  const request = { method: 'GET', path: '/api/posts/1' }
  const host = {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
  } as unknown as ArgumentsHost
  return { host, json, response }
}

describe('HttpExceptionFilter', () => {
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    errorSpy.mockRestore()
  })

  it('includes the active trace id in the error body so users can report it', () => {
    jest.spyOn(trace, 'getActiveSpan').mockReturnValue({
      spanContext: () => ({ traceId: '4bf92f3577b34da6a3ce929d0e0e4736' }),
    } as unknown as ReturnType<typeof trace.getActiveSpan>)
    const { host, json, response } = fakeHost()

    new HttpExceptionFilter().catch(new NotFoundException('Post not found'), host)

    expect(response.status).toHaveBeenCalledWith(404)
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Post not found',
        trace_id: '4bf92f3577b34da6a3ce929d0e0e4736',
      }),
    )
  })

  it('omits trace_id when tracing is disabled', () => {
    jest.spyOn(trace, 'getActiveSpan').mockReturnValue(undefined)
    const { host, json } = fakeHost()

    new HttpExceptionFilter().catch(new Error('boom'), host)

    expect(json.mock.calls[0][0].trace_id).toBeUndefined()
  })
})
