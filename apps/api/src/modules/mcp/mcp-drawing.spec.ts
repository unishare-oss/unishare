import {
  createExcalidrawElements,
  calculateOccupiedBounds,
  getSuggestedPlacements,
  summarizeElements,
} from './mcp-drawing'

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

describe('calculateOccupiedBounds', () => {
  it('returns null for empty elements list', () => {
    expect(calculateOccupiedBounds([])).toBeNull()
  })

  it('ignores deleted elements', () => {
    const elements = [
      { id: '1', type: 'rectangle', x: 0, y: 0, width: 100, height: 100, isDeleted: true },
    ]
    expect(calculateOccupiedBounds(elements)).toBeNull()
  })

  it('calculates bounding box across multiple shapes', () => {
    const elements = [
      { id: '1', type: 'rectangle', x: 100, y: 50, width: 200, height: 100, isDeleted: false },
      { id: '2', type: 'ellipse', x: 400, y: 200, width: 150, height: 80, isDeleted: false },
    ]
    const bounds = calculateOccupiedBounds(elements)
    expect(bounds).toEqual({
      minX: 100,
      minY: 50,
      maxX: 550,
      maxY: 280,
      width: 450,
      height: 230,
    })
  })

  it('takes arrow relative waypoints into account', () => {
    const elements = [
      {
        id: '1',
        type: 'arrow',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        points: [
          [0, 0],
          [200, 150],
        ],
        isDeleted: false,
      },
    ]
    const bounds = calculateOccupiedBounds(elements)
    expect(bounds).toEqual({
      minX: 100,
      minY: 100,
      maxX: 300,
      maxY: 250,
      width: 200,
      height: 150,
    })
  })
})

describe('getSuggestedPlacements', () => {
  it('returns default 100,100 anchors when bounds are null', () => {
    expect(getSuggestedPlacements(null)).toEqual({
      right: { x: 100, y: 100 },
      bottom: { x: 100, y: 100 },
    })
  })

  it('returns right and bottom offsets with padding when bounds exist', () => {
    const bounds = {
      minX: 100,
      minY: 50,
      maxX: 500,
      maxY: 300,
      width: 400,
      height: 250,
    }
    expect(getSuggestedPlacements(bounds)).toEqual({
      right: { x: 600, y: 50 },
      bottom: { x: 100, y: 400 },
    })
  })
})

describe('summarizeElements', () => {
  it('filters deleted elements and returns concise summaries', () => {
    const elements = [
      {
        id: 'el-1',
        type: 'rectangle',
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        isDeleted: false,
      },
      {
        id: 'el-2',
        type: 'text',
        x: 15,
        y: 25,
        width: 80,
        height: 30,
        text: 'API Gateway',
        isDeleted: false,
      },
      {
        id: 'el-3',
        type: 'ellipse',
        x: 200,
        y: 200,
        width: 50,
        height: 50,
        isDeleted: true,
      },
    ]

    const summaries = summarizeElements(elements)
    expect(summaries).toEqual([
      { id: 'el-1', type: 'rectangle', x: 10, y: 20, width: 100, height: 50 },
      { id: 'el-2', type: 'text', x: 15, y: 25, width: 80, height: 30, text: 'API Gateway' },
    ])
  })
})
