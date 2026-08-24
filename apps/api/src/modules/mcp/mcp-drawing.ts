import { nanoid } from 'nanoid'

type McpDrawingStyle = {
  strokeColor?: string
  backgroundColor?: string
}

type McpDrawingPoint = [number, number]

export type McpDrawingInput =
  | ({
      type: 'rectangle' | 'ellipse' | 'diamond'
      x: number
      y: number
      width: number
      height: number
    } & McpDrawingStyle)
  | ({ type: 'text'; x: number; y: number; text: string } & McpDrawingStyle)
  | ({
      type: 'arrow'
      x: number
      y: number
      endX?: number
      endY?: number
      points?: McpDrawingPoint[]
    } & McpDrawingStyle)

function randomInteger() {
  return Math.floor(Math.random() * 2 ** 31)
}

const defaultColors = {
  rectangle: { strokeColor: '#2563eb', backgroundColor: 'transparent' },
  diamond: { strokeColor: '#d97706', backgroundColor: 'transparent' },
  ellipse: { strokeColor: '#16a34a', backgroundColor: 'transparent' },
  arrow: { strokeColor: '#475569', backgroundColor: 'transparent' },
  text: { strokeColor: '#1e1e1e', backgroundColor: 'transparent' },
} as const

function baseElement(
  type: string,
  x: number,
  y: number,
  width: number,
  height: number,
  style: McpDrawingStyle,
) {
  const colors = defaultColors[type as keyof typeof defaultColors] ?? defaultColors.text

  return {
    id: nanoid(),
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: style.strokeColor ?? colors.strokeColor,
    backgroundColor: style.backgroundColor ?? colors.backgroundColor,
    fillStyle: 'hachure',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    index: null,
    roundness: null,
    seed: randomInteger(),
    version: 1,
    versionNonce: randomInteger(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
  }
}

export function createExcalidrawElements(inputs: McpDrawingInput[]): Record<string, unknown>[] {
  return inputs.map((input) => {
    switch (input.type) {
      case 'rectangle':
      case 'ellipse':
      case 'diamond':
        return baseElement(input.type, input.x, input.y, input.width, input.height, input)
      case 'text': {
        const lineCount = input.text.split('\n').length
        const longestLine = Math.max(...input.text.split('\n').map((line) => line.length))
        const fontSize = 20
        return {
          ...baseElement(
            'text',
            input.x,
            input.y,
            longestLine * fontSize * 0.6,
            lineCount * fontSize * 1.25,
            input,
          ),
          text: input.text,
          fontSize,
          fontFamily: 5,
          textAlign: 'left',
          verticalAlign: 'top',
          containerId: null,
          originalText: input.text,
          autoResize: true,
          lineHeight: 1.25,
        }
      }
      case 'arrow': {
        const points = input.points ?? [
          [0, 0],
          [(input.endX ?? input.x) - input.x, (input.endY ?? input.y) - input.y],
        ]
        const minX = Math.min(...points.map(([x]) => x))
        const minY = Math.min(...points.map(([, y]) => y))
        const normalizedPoints = points.map(([x, y]) => [x - minX, y - minY])
        const width = Math.max(...normalizedPoints.map(([x]) => x))
        const height = Math.max(...normalizedPoints.map(([, y]) => y))
        return {
          ...baseElement('arrow', input.x + minX, input.y + minY, width, height, input),
          points: normalizedPoints,
          lastCommittedPoint: null,
          startBinding: null,
          endBinding: null,
          startArrowhead: null,
          endArrowhead: 'arrow',
          elbowed: false,
        }
      }
    }
  })
}

export interface OccupiedBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export interface SuggestedPlacements {
  right: { x: number; y: number }
  bottom: { x: number; y: number }
}

export interface McpElementSummary {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  text?: string
}

export function calculateOccupiedBounds(
  elements: Record<string, unknown>[],
): OccupiedBounds | null {
  const activeElements = elements.filter((el) => !el.isDeleted)
  if (activeElements.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const el of activeElements) {
    const x = typeof el.x === 'number' && Number.isFinite(el.x) ? el.x : undefined
    const y = typeof el.y === 'number' && Number.isFinite(el.y) ? el.y : undefined
    const width = typeof el.width === 'number' && Number.isFinite(el.width) ? el.width : 0
    const height = typeof el.height === 'number' && Number.isFinite(el.height) ? el.height : 0

    if (x === undefined || y === undefined) continue

    let elMinX = x
    let elMinY = y
    let elMaxX = x + width
    let elMaxY = y + height

    if (Array.isArray(el.points) && el.points.length > 0) {
      const pointCoords = el.points.filter(
        (pt) =>
          Array.isArray(pt) &&
          pt.length >= 2 &&
          typeof pt[0] === 'number' &&
          typeof pt[1] === 'number' &&
          Number.isFinite(pt[0]) &&
          Number.isFinite(pt[1]),
      )

      if (pointCoords.length > 0) {
        const ptMinX = Math.min(...pointCoords.map(([px]) => px))
        const ptMaxX = Math.max(...pointCoords.map(([px]) => px))
        const ptMinY = Math.min(...pointCoords.map(([, py]) => py))
        const ptMaxY = Math.max(...pointCoords.map(([, py]) => py))

        elMinX = Math.min(elMinX, x + ptMinX)
        elMaxX = Math.max(elMaxX, x + ptMaxX)
        elMinY = Math.min(elMinY, y + ptMinY)
        elMaxY = Math.max(elMaxY, y + ptMaxY)
      }
    }

    if (elMinX < minX) minX = elMinX
    if (elMinY < minY) minY = elMinY
    if (elMaxX > maxX) maxX = elMaxX
    if (elMaxY > maxY) maxY = elMaxY
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY)
  ) {
    return null
  }

  return {
    minX: Math.round(minX),
    minY: Math.round(minY),
    maxX: Math.round(maxX),
    maxY: Math.round(maxY),
    width: Math.round(maxX - minX),
    height: Math.round(maxY - minY),
  }
}

export function getSuggestedPlacements(bounds: OccupiedBounds | null): SuggestedPlacements {
  const PADDING = 100
  if (!bounds) {
    return {
      right: { x: 100, y: 100 },
      bottom: { x: 100, y: 100 },
    }
  }

  return {
    right: { x: bounds.maxX + PADDING, y: bounds.minY },
    bottom: { x: bounds.minX, y: bounds.maxY + PADDING },
  }
}

export function summarizeElements(elements: Record<string, unknown>[]): McpElementSummary[] {
  return elements
    .filter((el) => !el.isDeleted)
    .map((el) => {
      const summary: McpElementSummary = {
        id: String(el.id ?? ''),
        type: String(el.type ?? 'unknown'),
        x: typeof el.x === 'number' ? Math.round(el.x) : 0,
        y: typeof el.y === 'number' ? Math.round(el.y) : 0,
        width: typeof el.width === 'number' ? Math.round(el.width) : 0,
        height: typeof el.height === 'number' ? Math.round(el.height) : 0,
      }
      if (typeof el.text === 'string' && el.text.trim()) {
        summary.text = el.text
      }
      return summary
    })
}
