// `pdf-parse` wraps pdfjs-dist, which is ESM-only and, on Node, loads its "fake worker"
// via a runtime `await import(...)`. Jest's vm.Script sandbox can't resolve that without
// `--experimental-vm-modules` on NODE_OPTIONS, or every PDF path here throws
// `Setting up fake worker failed: "A dynamic import callback was invoked without
// --experimental-vm-modules"`. `test`/`test:watch`/`test:cov` in package.json already set
// the flag. `test:e2e` currently does NOT — safe for now because no e2e spec exercises
// this module, but the next e2e test that imports this service (or anything that pulls
// in `pdf-parse`) will need the same flag added there too.
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

/**
 * Characters Postgres cannot store in a `text` column, whatever the extractor hands us.
 *
 * NUL is the one that actually bit: four production PDFs failed ingestion on
 * `22021 invalid byte sequence for encoding "UTF8": 0x00`. A NUL rejects the WHOLE
 * `createMany` batch, so one bad glyph loses an entire document — the file lands in FAILED,
 * retrieval excludes it, and to a student the document simply never answers questions.
 *
 * Lone surrogates are included because they fail identically and for the same underlying
 * reason: a code unit that is not, on its own, encodable as UTF-8. PDF text extraction
 * reaches both — glyphs with no Unicode mapping and text split mid-surrogate-pair.
 *
 * Deliberately narrow. Other C0 controls (form feed, vertical tab) are ugly but perfectly
 * storable, and stripping them would be quietly editing document text rather than fixing a
 * defect. The rule here is exactly "remove what cannot be persisted", nothing more.
 */
// The rule below exists to catch a control character typed in by accident. Here the
// control character IS the defect being matched, so the directive must sit directly
// above the regex -- eslint-disable-next-line applies to the literal next line, and a
// comment in between would silently consume it.
// eslint-disable-next-line no-control-regex
const UNSTORABLE = /\u0000|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g

/**
 * Removes characters that would make a chunk write fail. Exported for direct testing —
 * the interesting cases are one-character strings, and routing them through a real PDF
 * would test pdfjs rather than this rule.
 */
export function stripUnstorableChars(text: string): string {
  return text.replace(UNSTORABLE, '')
}

export interface ExtractedPage {
  num: number
  text: string
}

export interface ExtractedDocument {
  pages: ExtractedPage[]
  /** False for .docx — mammoth has no page concept, so citations fall back to chunk index. */
  hasPageNumbers: boolean
}

@Injectable()
export class DocumentExtractorService {
  private readonly logger = new Logger(DocumentExtractorService.name)
  private s3Client: S3Client | null = null
  private bucket: string | null = null

  constructor(private readonly config: ConfigService) {}

  async extractFromBuffer(buffer: Buffer, mimeType: string): Promise<ExtractedDocument> {
    if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`Unsupported mime type: ${mimeType}`)
    }

    // Sanitising HERE rather than at the chunk write is deliberate: this is the single
    // point both formats pass through, and every consumer -- chunking, embedding, the
    // map-reduce summary, quiz generation -- reads its text from this return value. A guard
    // at the persistence layer would leave the same bytes flowing to everything else.
    if (mimeType === 'application/pdf') {
      const parser = new PDFParse({ data: new Uint8Array(buffer) })
      const result = await parser.getText()
      return {
        pages: result.pages.map((page) => ({
          num: page.num,
          text: stripUnstorableChars(page.text),
        })),
        hasPageNumbers: true,
      }
    }

    const result = await mammoth.extractRawText({ buffer })
    return {
      pages: [{ num: 1, text: stripUnstorableChars(result.value) }],
      hasPageNumbers: false,
    }
  }

  async extractFromKey(key: string, mimeType: string): Promise<ExtractedDocument> {
    const buffer = await this.download(key)
    return this.extractFromBuffer(buffer, mimeType)
  }

  /** Joined plain text, uncapped. Kept for quiz generation, which slices it itself. */
  async extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
    const doc = await this.extractFromBuffer(buffer, mimeType)
    return doc.pages
      .map((page) => page.text.trim())
      .filter(Boolean)
      .join('\n\n')
  }

  private client(): S3Client {
    if (this.s3Client) return this.s3Client
    this.s3Client = new S3Client({
      region: this.config.get('S3_REGION') ?? 'auto',
      // Server-side GetObject only -- never presigns for a browser, so it prefers the
      // direct in-cluster route when one is configured.
      endpoint:
        this.config.get<string>('S3_INTERNAL_ENDPOINT') ?? this.config.getOrThrow('S3_ENDPOINT'),
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.getOrThrow('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow('S3_SECRET_ACCESS_KEY'),
      },
    })
    this.bucket = this.config.getOrThrow('S3_BUCKET')
    return this.s3Client
  }

  private async download(key: string): Promise<Buffer> {
    const client = this.client()
    const response = await client.send(
      new GetObjectCommand({ Bucket: this.bucket as string, Key: key }),
    )
    const chunks: Uint8Array[] = []
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  }
}
