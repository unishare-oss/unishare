import { createExcalidrawElements } from './mcp-drawing'

describe('createExcalidrawElements', () => {
  it('creates complete elements with Excalidraw base properties', () => {
    const [rectangle] = createExcalidrawElements([
      { type: 'rectangle', x: 10, y: 20, width: 100, height: 50 },
    ])

    expect(rectangle).toEqual(
      expect.objectContaining({
        type: 'rectangle',
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        strokeColor: '#2563eb',
        backgroundColor: '#dbeafe',
        groupIds: [],
        isDeleted: false,
        version: 1,
      }),
    )
  })

  it('uses a visible default palette for each diagram shape', () => {
    const [rectangle, diamond, ellipse] = createExcalidrawElements([
      { type: 'rectangle', x: 0, y: 0, width: 10, height: 10 },
      { type: 'diamond', x: 0, y: 0, width: 10, height: 10 },
      { type: 'ellipse', x: 0, y: 0, width: 10, height: 10 },
    ])

    expect(rectangle).toEqual(expect.objectContaining({ backgroundColor: '#dbeafe' }))
    expect(diamond).toEqual(expect.objectContaining({ backgroundColor: '#fef3c7' }))
    expect(ellipse).toEqual(expect.objectContaining({ backgroundColor: '#dcfce7' }))
  })

  it('creates arrow points from the requested start and end positions', () => {
    const [arrow] = createExcalidrawElements([{ type: 'arrow', x: 10, y: 20, endX: 110, endY: 70 }])

    expect(arrow).toEqual(
      expect.objectContaining({
        type: 'arrow',
        width: 100,
        height: 50,
        points: [
          [0, 0],
          [100, 50],
        ],
        endArrowhead: 'arrow',
      }),
    )
  })

  it('uses requested colors while keeping other Excalidraw defaults', () => {
    const [rectangle] = createExcalidrawElements([
      {
        type: 'rectangle',
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        strokeColor: '#2563eb',
        backgroundColor: '#dbeafe',
      },
    ])

    expect(rectangle).toEqual(
      expect.objectContaining({
        strokeColor: '#2563eb',
        backgroundColor: '#dbeafe',
        groupIds: [],
      }),
    )
  })
})
