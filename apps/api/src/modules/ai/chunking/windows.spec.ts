import { groupIntoWindows, SUMMARY_WINDOW_CHARS } from './windows'

describe('groupIntoWindows', () => {
  it('returns an empty array for no input', () => {
    expect(groupIntoWindows([])).toEqual([])
  })

  it('packs short texts into a single window', () => {
    expect(groupIntoWindows(['a', 'b', 'c'], 100)).toEqual(['a\n\nb\n\nc'])
  })

  it('opens a new window when adding the next text would exceed the budget', () => {
    const windows = groupIntoWindows(['x'.repeat(60), 'y'.repeat(60)], 100)
    expect(windows).toHaveLength(2)
    expect(windows[0]).toBe('x'.repeat(60))
    expect(windows[1]).toBe('y'.repeat(60))
  })

  it('keeps a single oversized text in its own window rather than dropping it', () => {
    const windows = groupIntoWindows(['z'.repeat(500)], 100)
    expect(windows).toHaveLength(1)
    expect(windows[0]).toHaveLength(500)
  })

  it('skips empty and whitespace-only texts', () => {
    expect(groupIntoWindows(['a', '', '   ', 'b'], 100)).toEqual(['a\n\nb'])
  })

  it('defaults to a 12000-character budget', () => {
    expect(SUMMARY_WINDOW_CHARS).toBe(12_000)
    const windows = groupIntoWindows(Array.from({ length: 10 }, () => 'q'.repeat(2000)))
    // 10 x 2000 = 20000 chars -> 2 windows at 12000
    expect(windows).toHaveLength(2)
  })
})
