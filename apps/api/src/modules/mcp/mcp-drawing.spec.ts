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
        backgroundColor: 'transparent',
        groupIds: [],
        isDeleted: false,
        version: 1,
      }),
    )
  })

  it('uses colored outlines and transparent backgrounds for diagram shapes by default', () => {
    const [rectangle, diamond, ellipse] = createExcalidrawElements([
      { type: 'rectangle', x: 0, y: 0, width: 10, height: 10 },
      { type: 'diamond', x: 0, y: 0, width: 10, height: 10 },
      { type: 'ellipse', x: 0, y: 0, width: 10, height: 10 },
    ])

    expect(rectangle).toEqual(
      expect.objectContaining({ strokeColor: '#2563eb', backgroundColor: 'transparent' }),
    )
    expect(diamond).toEqual(
      expect.objectContaining({ strokeColor: '#d97706', backgroundColor: 'transparent' }),
    )
    expect(ellipse).toEqual(
      expect.objectContaining({ strokeColor: '#16a34a', backgroundColor: 'transparent' }),
    )
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

  it('preserves multi-segment arrow points for routed connectors', () => {
    const [arrow] = createExcalidrawElements([
      {
        type: 'arrow',
        x: 100,
        y: 100,
        points: [
          [0, 0],
          [120, 0],
          [120, 80],
          [240, 80],
        ],
      },
    ])

    expect(arrow).toEqual(
      expect.objectContaining({
        type: 'arrow',
        x: 100,
        y: 100,
        width: 240,
        height: 80,
        points: [
          [0, 0],
          [120, 0],
          [120, 80],
          [240, 80],
        ],
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
