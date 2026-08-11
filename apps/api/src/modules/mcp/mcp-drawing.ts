import { nanoid } from 'nanoid'

type McpDrawingStyle = {
  strokeColor?: string
  backgroundColor?: string
}

export type McpDrawingInput =
  | ({
      type: 'rectangle' | 'ellipse' | 'diamond'
      x: number
      y: number
      width: number
      height: number
    } & McpDrawingStyle)
  | ({ type: 'text'; x: number; y: number; text: string } & McpDrawingStyle)
  | ({ type: 'arrow'; x: number; y: number; endX: number; endY: number } & McpDrawingStyle)

function randomInteger() {
  return Math.floor(Math.random() * 2 ** 31)
}

const defaultColors = {
  rectangle: { strokeColor: '#2563eb', backgroundColor: '#dbeafe' },
  diamond: { strokeColor: '#d97706', backgroundColor: '#fef3c7' },
  ellipse: { strokeColor: '#16a34a', backgroundColor: '#dcfce7' },
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
        const width = input.endX - input.x
        const height = input.endY - input.y
        return {
          ...baseElement('arrow', input.x, input.y, width, height, input),
          points: [
            [0, 0],
            [width, height],
          ],
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
