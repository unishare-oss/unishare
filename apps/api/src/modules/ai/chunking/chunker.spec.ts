import { chunkDocument, CHUNK_MAX_CHARS, CHUNK_OVERLAP_CHARS } from './chunker'
import type { ExtractedDocument } from '../extraction/document-extractor.service'

function doc(pages: string[], hasPageNumbers = true): ExtractedDocument {
  return {
    pages: pages.map((text, i) => ({ num: i + 1, text })),
    hasPageNumbers,
  }
}

describe('chunkDocument', () => {
  it('returns an empty array for a document with no pages', () => {
    expect(chunkDocument(doc([]))).toEqual([])
  })

  it('returns a single chunk for one short page', () => {
    const chunks = chunkDocument(doc(['hello world']))
    expect(chunks).toEqual([{ chunkIndex: 0, content: 'hello world', pageNum: 1 }])
  })

  it('never merges two pages into one chunk', () => {
    const chunks = chunkDocument(doc(['alpha', 'bravo']))
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toEqual({ chunkIndex: 0, content: 'alpha', pageNum: 1 })
    expect(chunks[1]).toEqual({ chunkIndex: 1, content: 'bravo', pageNum: 2 })
  })

  it('skips whitespace-only pages but keeps numbering of real pages', () => {
    const chunks = chunkDocument(doc(['alpha', '   \n\t ', 'charlie']))
    expect(chunks).toHaveLength(2)
    expect(chunks.map((c) => c.pageNum)).toEqual([1, 3])
    expect(chunks.map((c) => c.chunkIndex)).toEqual([0, 1])
  })

  it('splits a long page into chunks no larger than maxChars', () => {
    const chunks = chunkDocument(doc(['x'.repeat(5000)]), {
      maxChars: 1000,
      overlapChars: 100,
    })
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((c) => c.content.length <= 1000)).toBe(true)
    expect(chunks.every((c) => c.pageNum === 1)).toBe(true)
  })

  it('advances by maxChars minus overlapChars so consecutive chunks overlap', () => {
    const text = 'abcdefghij'.repeat(30) // 300 chars
    const chunks = chunkDocument(doc([text]), { maxChars: 100, overlapChars: 20 })
    // stride 80 -> starts at 0, 80, 160, 240 -> exact slice boundaries for every chunk,
    // including the final short one, so a wrong stride/off-by-one fails loudly.
    expect(chunks).toHaveLength(4)
    expect(chunks[0].content).toBe(text.slice(0, 100))
    expect(chunks[1].content).toBe(text.slice(80, 180))
    expect(chunks[2].content).toBe(text.slice(160, 260))
    expect(chunks[3].content).toBe(text.slice(240, 300))
    expect(chunks[3].content).toHaveLength(60)
    const tail = chunks[0].content.slice(-20)
    expect(chunks[1].content.startsWith(tail)).toBe(true)
  })

  it('numbers chunks sequentially across pages starting at zero', () => {
    const chunks = chunkDocument(doc(['y'.repeat(250), 'z'.repeat(250)]), {
      maxChars: 100,
      overlapChars: 20,
    })
    expect(chunks.map((c) => c.chunkIndex)).toEqual(chunks.map((_, i) => i))
  })

  it('sets pageNum to null when the source has no page numbers', () => {
    const chunks = chunkDocument(doc(['docx body'], false))
    expect(chunks[0].pageNum).toBeNull()
  })

  it('throws when overlap is not smaller than maxChars', () => {
    expect(() => chunkDocument(doc(['a']), { maxChars: 100, overlapChars: 100 })).toThrow(
      'overlapChars must be smaller than maxChars',
    )
  })

  it('uses sane defaults', () => {
    expect(CHUNK_MAX_CHARS).toBe(2000)
    expect(CHUNK_OVERLAP_CHARS).toBe(200)
    const chunks = chunkDocument(doc(['w'.repeat(CHUNK_MAX_CHARS * 2)]))
    expect(chunks.every((c) => c.content.length <= CHUNK_MAX_CHARS)).toBe(true)
  })
})
