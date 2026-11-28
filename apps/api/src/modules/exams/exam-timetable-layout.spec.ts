import { rebuildTimetableRows, type PositionedTextItem } from './exam-timetable-layout'

const rowYs = [456, 432, 412, 391, 371, 350, 327, 304, 283, 263, 242, 221, 201, 180, 160, 139]
const dateMarkers = [
  [456, 'Mon. 30 Nov., 2026'],
  [412, 'Tue. 1 Dec., 2026'],
  [337, 'Thu. 3 Dec., 2026'],
  [273, 'Fri. 4 Dec., 2026'],
  [232, 'Tue. 8 Dec., 2026'],
  [191, 'Wed. 9 Dec., 2026'],
  [150, 'Fri. 11 Dec., 2026'],
] as const

function rowNumbers(ys: number[] = rowYs, start = 1): PositionedTextItem[] {
  return ys.map((y, index) => ({ str: String(start + index), x: 63, y }))
}

function timetableItems(): PositionedTextItem[] {
  const items: PositionedTextItem[] = []
  for (let index = 0; index < rowYs.length; index++) {
    const row = index + 1
    const y = rowYs[index]
    items.push(
      rowNumbers([y], row)[0],
      { str: '9.30-11.30', x: 255, y },
      { str: row === 16 ? 'TOEIC Mock Test' : `CSC${350 + row} Security Management`, x: 350, y },
      { str: 'Lecturer Name', x: 500, y },
      { str: `Room ${row}`, x: 650, y },
      { str: 'Class A', x: 750, y },
      { str: '30', x: 850, y },
    )
  }
  for (const [y, str] of dateMarkers) items.push({ str, x: 80, y })
  return items
}

describe('rebuildTimetableRows', () => {
  it('fills all 16 rows from dates vertically centred over each merged group', () => {
    const lines = rebuildTimetableRows(timetableItems())
    const dates = [
      'Mon. 30 Nov., 2026',
      ...Array(3).fill('Tue. 1 Dec., 2026'),
      ...Array(4).fill('Thu. 3 Dec., 2026'),
      ...Array(2).fill('Fri. 4 Dec., 2026'),
      ...Array(2).fill('Tue. 8 Dec., 2026'),
      ...Array(2).fill('Wed. 9 Dec., 2026'),
      ...Array(2).fill('Fri. 11 Dec., 2026'),
    ]

    expect(lines).toHaveLength(16)
    dates.forEach((date, index) => {
      expect(lines?.[index]).toContain(`${date} ${index + 1} 9.30-11.30`)
    })
  })

  it('attaches wrapped room and title lines to the nearest row and keeps month words in titles', () => {
    const items: PositionedTextItem[] = [
      ...rowNumbers([100, 80]),
      { str: 'Mon. 30 Nov., 2026', x: 80, y: 90 },
      { str: 'Second Lecturer', x: 500, y: 90 },
      { str: '9.30-11.30', x: 255, y: 100 },
      { str: 'CSC101', x: 300, y: 100 },
      { str: 'Advanced', x: 350, y: 100 },
      { str: 'Security Management', x: 350, y: 96 },
      { str: 'Please check in', x: 650, y: 100 },
      { str: 'New ACIS System', x: 650, y: 104 },
      { str: '9.30-11.30', x: 255, y: 80 },
      { str: 'CSC102', x: 300, y: 80 },
      { str: 'March Security Basics', x: 350, y: 80 },
    ]

    const rows = rebuildTimetableRows(items)

    expect(rows?.[0]).toContain('Advanced Security Management')
    expect(rows?.[0]).toContain('New ACIS System Please check in')
    expect(rows?.[0]).toContain('Second Lecturer')
    expect(rows?.[1]).toContain('March Security Basics')
  })

  it('keeps lines below the last row as trailing context', () => {
    const rows = rebuildTimetableRows([
      ...rowNumbers([100, 80]),
      { str: 'Mon. 30 Nov., 2026', x: 80, y: 90 },
      { str: 'Header', x: 63, y: 140 },
      { str: 'Footer note', x: 63, y: 50 },
      { str: 'CSC101 Security', x: 350, y: 100 },
      { str: 'CSC102 Security', x: 350, y: 80 },
    ])

    expect(rows?.[0]).toBe('Header')
    expect(rows?.[rows.length - 1]).toBe('Footer note')
  })

  it('accepts consecutive row numbers that continue from an earlier page', () => {
    const items: PositionedTextItem[] = [
      ...rowNumbers([100, 80], 17),
      { str: 'Mon. 30 Nov., 2026', x: 80, y: 90 },
      { str: '9.30-11.30', x: 255, y: 100 },
      { str: 'CSC117', x: 350, y: 100 },
      { str: '9.30-11.30', x: 255, y: 80 },
      { str: 'CSC118', x: 350, y: 80 },
    ]

    expect(rebuildTimetableRows(items)?.[0]).toContain(' 17 9.30-11.30 CSC117')
    expect(rebuildTimetableRows(items)?.[1]).toContain(' 18 9.30-11.30 CSC118')
  })

  it('falls back when merged dates are top-aligned', () => {
    const rows = rowNumbers()
    const dates = [456, 371, 242].map((y, index) => ({
      str: `Mon. ${index + 1} Nov., 2026`,
      x: 80,
      y,
    }))
    expect(rebuildTimetableRows([...rows, ...dates])).toBeNull()
  })

  it('falls back when there are no dates', () => {
    expect(rebuildTimetableRows(rowNumbers())).toBeNull()
  })

  it('falls back when date groups cannot satisfy the centering rule', () => {
    const rows = rowNumbers()
    const dates = [456, 412, 337, 273, 232, 191, 139].map((y, index) => ({
      str: `Mon. ${index + 1} Nov., 2026`,
      x: 80,
      y,
    }))
    expect(rebuildTimetableRows([...rows, ...dates])).toBeNull()
  })

  it('preserves a date on every row', () => {
    const items = rowYs.flatMap((y, index) => [
      rowNumbers([y], index + 1)[0],
      { str: `Mon. ${index + 1} Nov., 2026`, x: 80, y },
      { str: '9.30-11.30', x: 255, y },
      { str: 'CSC352 Security Management', x: 350, y },
    ])

    expect(rebuildTimetableRows(items)).toHaveLength(16)
    expect(rebuildTimetableRows(items)?.[15]).toContain('Mon. 16 Nov., 2026')
  })
})
