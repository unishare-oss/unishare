import type { ExtractedDocument } from '../extraction/document-extractor.service'

/** ~500 tokens. Well inside nomic-embed-text's 8192-token context. */
export const CHUNK_MAX_CHARS = 2000
export const CHUNK_OVERLAP_CHARS = 200

export interface Chunk {
  chunkIndex: number
  content: string
  pageNum: number | null
}

export interface ChunkOptions {
  maxChars?: number
  overlapChars?: number
}

/**
 * Splits a document into overlapping chunks. A chunk never spans a page boundary, so
 * pageNum stays truthful and citations can point at a real page.
 */
export function chunkDocument(doc: ExtractedDocument, options: ChunkOptions = {}): Chunk[] {
  const maxChars = options.maxChars ?? CHUNK_MAX_CHARS
  const overlapChars = options.overlapChars ?? CHUNK_OVERLAP_CHARS

  if (overlapChars >= maxChars) {
    throw new Error('overlapChars must be smaller than maxChars')
  }

  const stride = maxChars - overlapChars
  const chunks: Chunk[] = []

  for (const page of doc.pages) {
    const text = page.text.trim()
    if (!text) continue

    for (let start = 0; start < text.length; start += stride) {
      const content = text.slice(start, start + maxChars).trim()
      if (content) {
        chunks.push({
          chunkIndex: chunks.length,
          content,
          pageNum: doc.hasPageNumbers ? page.num : null,
        })
      }
      if (start + maxChars >= text.length) break
    }
  }

  return chunks
}
