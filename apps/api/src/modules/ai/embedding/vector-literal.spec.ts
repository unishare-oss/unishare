import { toVectorLiteral } from './vector-literal'

describe('toVectorLiteral', () => {
  it('formats a vector as a bracketed comma-separated list', () => {
    expect(toVectorLiteral([1, 2.5, -0.25])).toBe('[1,2.5,-0.25]')
  })

  it('rejects an empty vector', () => {
    expect(() => toVectorLiteral([])).toThrow('empty')
  })

  it('rejects non-finite values that Postgres would not accept', () => {
    expect(() => toVectorLiteral([1, NaN])).toThrow('non-finite')
    expect(() => toVectorLiteral([1, Infinity])).toThrow('non-finite')
  })
})
