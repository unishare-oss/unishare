import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

/**
 * nomic-embed-text was trained with task prefixes. Omitting them degrades retrieval
 * quality substantially and silently — there is no error, results are just worse.
 * This service owns them so no caller can get it wrong.
 */
export const DOCUMENT_PREFIX = 'search_document: '
export const QUERY_PREFIX = 'search_query: '

const BATCH_SIZE = 32
const MAX_CONCURRENT_BATCHES = 2

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name)
  private readonly provider: string | null
  private readonly endpoint: string
  private readonly model: string
  readonly dimensions: number

  constructor(private readonly config: ConfigService) {
    this.provider = config.get<string>('AI_EMBEDDING_PROVIDER') || null
    this.endpoint = config.get<string>('AI_EMBEDDING_ENDPOINT') ?? 'http://localhost:11434'
    this.model = config.get<string>('AI_EMBEDDING_MODEL') || 'nomic-embed-text'
    this.dimensions = Number(config.get<string>('AI_EMBEDDING_DIMENSIONS') ?? 768)
  }

  get enabled(): boolean {
    return this.provider !== null
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return this.embed(texts.map((text) => DOCUMENT_PREFIX + text))
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.embed([QUERY_PREFIX + text])
    return vector
  }

  private async embed(inputs: string[]): Promise<number[][]> {
    if (!this.enabled) throw new Error('Embedding provider not configured')
    if (inputs.length === 0) return []

    const batches: string[][] = []
    for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
      batches.push(inputs.slice(i, i + BATCH_SIZE))
    }

    const results: number[][] = []
    // Bounded concurrency: Ollama here is CPU-only, so this exists to avoid a
    // thundering herd on a multi-file upload rather than to maximise throughput.
    for (let i = 0; i < batches.length; i += MAX_CONCURRENT_BATCHES) {
      const window = batches.slice(i, i + MAX_CONCURRENT_BATCHES)
      const settled = await Promise.all(window.map((batch) => this.embedBatch(batch)))
      for (const vectors of settled) results.push(...vectors)
    }

    return results
  }

  private async embedBatch(input: string[]): Promise<number[][]> {
    const response = await fetch(`${this.endpoint}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, input }),
    })

    if (!response.ok) {
      throw new Error(`Ollama /api/embed responded with ${response.status}`)
    }

    const data = (await response.json()) as { embeddings?: number[][] }
    const embeddings = data.embeddings

    if (!embeddings || embeddings.length !== input.length) {
      throw new Error(`Expected ${input.length} embeddings, got ${embeddings?.length ?? 0}`)
    }

    for (const vector of embeddings) {
      if (vector.length !== this.dimensions) {
        // Fail loud: a wrong-width vector is unrecoverable by later inspection,
        // because the stored numbers still look plausible.
        throw new Error(
          `Embedding width mismatch: expected ${this.dimensions}, got ${vector.length}`,
        )
      }
    }

    return embeddings
  }
}
