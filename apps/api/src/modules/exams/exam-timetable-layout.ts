export type PositionedTextItem = { str: string; x: number; y: number }

const DATE_COLUMN_MAX_X = 200
const ROW_NUMBER_MAX_X = 75
const LINE_Y_TOLERANCE = 2.5
const CENTER_Y_TOLERANCE = 5

const MONTH_PATTERN =
  /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b|ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม/i

type TextLine = { y: number; items: PositionedTextItem[] }
type TimetableRow = { number: number; y: number; items: PositionedTextItem[] }
type DateMarker = { y: number; text: string }

/** Rebuild one page of a numbered timetable, or return null when its date layout is unclear. */
export function rebuildTimetableRows(items: PositionedTextItem[]): string[] | null {
  const lines = groupLines(items)
  const rows: TimetableRow[] = []
  const dates: DateMarker[] = []

  for (const line of lines) {
    const dateItems = line.items.filter(isDateColumnItem)
    dates.push(...dateItems.map(({ str }) => ({ y: line.y, text: str.trim() })))

    const rowNumberItem = line.items.find(isRowNumberItem)
    if (rowNumberItem) {
      rows.push({
        number: Number(rowNumberItem.str.trim()),
        y: line.y,
        items: line.items.filter((item) => !isDateColumnItem(item)),
      })
    }
  }

  rows.sort((a, b) => b.y - a.y)
  dates.sort((a, b) => b.y - a.y)
  if (rows.length === 0 || dates.length === 0 || dates.length > rows.length) return null
  const firstRowNumber = rows[0].number
  if (rows.some((row, index) => row.number !== firstRowNumber + index)) return null

  const firstRowY = rows[0].y
  const lastRowY = rows[rows.length - 1].y
  const topRowLimit = firstRowY + (rows[1] ? (firstRowY - rows[1].y) / 2 : CENTER_Y_TOLERANCE)
  const bottomRowLimit =
    lastRowY - (rows.length > 1 ? (rows[rows.length - 2].y - lastRowY) / 2 : CENTER_Y_TOLERANCE)
  const contextLines = lines
    .filter(({ y, items }) => y > topRowLimit && !items.some(isDateColumnItem))
    .map(formatLine)
  const trailingContext: string[] = []
  for (const line of lines) {
    if (line.items.some(isRowNumberItem)) continue

    const dateItems = line.items.filter(isDateColumnItem)
    const otherItems = line.items.filter((item) => !isDateColumnItem(item))
    if (dateItems.length > 0) {
      if (otherItems.length > 0) {
        const nearestRow = rows.reduce((nearest, row) =>
          Math.abs(row.y - line.y) < Math.abs(nearest.y - line.y) ? row : nearest,
        )
        nearestRow.items.push(...otherItems)
      }
      continue
    }
    if (line.y > topRowLimit) continue
    if (line.y < bottomRowLimit) {
      trailingContext.push(formatLine(line))
      continue
    }

    const nearestRow = rows.reduce((nearest, row) =>
      Math.abs(row.y - line.y) < Math.abs(nearest.y - line.y) ? row : nearest,
    )
    nearestRow.items.push(...otherItems)
  }

  const dateForRow: string[] = []
  let firstUnassigned = 0
  for (let dateIndex = 0; dateIndex < dates.length; dateIndex++) {
    const marker = dates[dateIndex]
    const exclusiveEnd = rows.length - (dates.length - dateIndex - 1)
    let bestEnd = firstUnassigned
    let bestDistance = Number.POSITIVE_INFINITY

    for (let end = firstUnassigned; end < exclusiveEnd; end++) {
      const center = (rows[firstUnassigned].y + rows[end].y) / 2
      const distance = Math.abs(center - marker.y)
      if (distance < bestDistance) {
        bestDistance = distance
        bestEnd = end
      }
    }

    if (bestDistance > CENTER_Y_TOLERANCE) return null
    for (let index = firstUnassigned; index <= bestEnd; index++) dateForRow[index] = marker.text
    firstUnassigned = bestEnd + 1
  }

  if (firstUnassigned !== rows.length || dateForRow.length !== rows.length) return null

  const rebuiltRows = rows.map((row, index) => {
    const contents = row.items
      .slice()
      .sort((a, b) => a.x - b.x || b.y - a.y)
      .map(({ str }) => str.trim())
      .filter(Boolean)
    return [dateForRow[index], ...contents].join(' ')
  })
  return [...contextLines, ...rebuiltRows, ...trailingContext]
}

function groupLines(items: PositionedTextItem[]): TextLine[] {
  const ordered = items
    .filter(({ str, x, y }) => str.trim() && Number.isFinite(x) && Number.isFinite(y))
    .slice()
    .sort((a, b) => b.y - a.y || a.x - b.x)
  const lines: TextLine[] = []

  for (const item of ordered) {
    const line = lines.find(({ y }) => Math.abs(y - item.y) <= LINE_Y_TOLERANCE)
    if (line) line.items.push(item)
    else lines.push({ y: item.y, items: [item] })
  }

  return lines
}

function isDateText(value: string): boolean {
  const text = value.trim()
  return MONTH_PATTERN.test(text) || /^\d{1,2}[/. -]\d{1,2}[/. -]\d{2,4}$/.test(text)
}

function isRowNumberItem(item: PositionedTextItem): boolean {
  return item.x <= ROW_NUMBER_MAX_X && /^\d{1,3}$/.test(item.str.trim())
}

function isDateColumnItem(item: PositionedTextItem): boolean {
  return item.x <= DATE_COLUMN_MAX_X && isDateText(item.str)
}

function formatLine(line: TextLine): string {
  return line.items
    .slice()
    .sort((a, b) => a.x - b.x)
    .map(({ str }) => str.trim())
    .filter(Boolean)
    .join(' ')
}

type PdfJsTextContent = {
  items: Array<{ str?: string; transform?: number[] }>
}

type PdfJsPage = {
  getTextContent(): Promise<PdfJsTextContent>
}

type PdfJsDocument = {
  numPages: number
  getPage(pageNumber: number): Promise<PdfJsPage>
  destroy(): Promise<void>
}

/** Read text item positions without changing the shared document extractor. */
export async function readPositionedPdfPages(buffer: Buffer): Promise<PositionedTextItem[][]> {
  // require(esm) needs Node 22.12+. Older Node throws here; the caller catches it and uses plain text.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.mjs') as {
    getDocument(options: { data: Uint8Array }): { promise: Promise<PdfJsDocument> }
  }
  const document = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise

  try {
    const pages: PositionedTextItem[][] = []
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      pages.push(
        content.items.flatMap((item) => {
          const transform = item.transform
          if (typeof item.str !== 'string' || !transform || transform.length < 6) return []
          return [{ str: item.str, x: transform[4], y: transform[5] }]
        }),
      )
    }
    return pages
  } finally {
    await document.destroy()
  }
}
