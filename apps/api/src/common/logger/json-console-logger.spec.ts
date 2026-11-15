import { JsonConsoleLogger } from './json-console-logger'

function captureLine(write: () => void) {
  const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
  const errSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true)
  write()
  const raw = String((spy.mock.calls[0] ?? errSpy.mock.calls[0])[0])
  spy.mockRestore()
  errSpy.mockRestore()
  return JSON.parse(raw)
}

describe('JsonConsoleLogger', () => {
  const logger = new JsonConsoleLogger('Test', { json: true })

  it.each([
    ['log', 'info'],
    ['verbose', 'trace'],
    ['warn', 'warn'],
    ['error', 'error'],
    ['debug', 'debug'],
    ['fatal', 'fatal'],
  ] as const)('prints Nest level %s as %s', (method, expected) => {
    const line = captureLine(() => logger[method]('hello'))

    expect(line.level).toBe(expected)
    expect(line.message).toBe('hello')
    expect(line.context).toBe('Test')
  })

  it('keeps structured messages as nested JSON', () => {
    const line = captureLine(() =>
      logger.log({ event: 'http.request.completed', status_code: 200 }),
    )

    expect(line.message).toEqual({ event: 'http.request.completed', status_code: 200 })
  })
})
