import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { PrismaService } from '@/prisma/prisma.service'
import { TagsService } from '../tags/tags.service'
import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'

type AiProvider = 'groq' | 'gemini' | 'ollama'

const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const MAX_TEXT_CHARS = 6000

const SUMMARY_PROMPT = `You are summarizing an academic document for university students.
Respond with exactly this format — no extra text, no markdown headers:

One sentence describing what this document is (e.g. "Past paper for ENG301 covering chapters 4–7 from the 2023 finals.").
• Key topic or concept covered
• Key topic or concept covered
• Key topic or concept covered

Use 3 bullet points. Be specific about subject matter — not generic. No fluff.`

const TAGGING_PROMPT = `You are tagging an academic document for a university file-sharing platform.
Based on the summary provided, suggest 3 to 5 short academic subject tags.

Rules:
- Each tag is 2–40 characters, lowercase, letters/numbers/spaces/hyphens only
- Tags should reflect the academic subject, course type, or key topic (e.g. "calculus", "data structures", "past paper", "lab report")
- Do NOT use tags like "academic", "university", "document", or "study material"
- Respond with ONLY a comma-separated list of tags, nothing else

Example output: linear algebra, matrices, past paper, engineering mathematics`

const SCREENING_PROMPT = `You are a content moderator for a university academic file-sharing platform.
Review the following post and determine if it contains any of these issues:
1. Exam cheating materials (full answer sheets, leaked exams not from past papers, solutions intended to be submitted as original work)
2. Clearly inappropriate, offensive, or harmful content
3. Completely off-topic (not academic, not related to university study)
4. Obvious copyright infringement (verbatim copy of a published textbook)

If the content appears SAFE, respond with exactly: SAFE
If the content has an issue, respond with exactly: FLAG: [brief one-sentence reason]

Do NOT flag content for:
- Normal past papers, revision notes, lecture notes, assignments
- Legitimate study materials even if they contain answers or solutions
- Minor quality issues

Examples:
SAFE
FLAG: Contains what appears to be a complete leaked exam with answer keys intended for cheating.`

@Injectable()
export class AiSummaryService {
  private readonly logger = new Logger(AiSummaryService.name)
  private readonly provider: AiProvider | null
  private s3Client: S3Client
  private bucket: string

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tagsService: TagsService,
  ) {
    this.provider = (config.get<string>('AI_SUMMARY_PROVIDER') as AiProvider) || null

    if (this.provider) {
      this.s3Client = new S3Client({
        region: config.get('S3_REGION') ?? 'auto',
        endpoint: config.getOrThrow('S3_ENDPOINT'),
        forcePathStyle: true,
        credentials: {
          accessKeyId: config.getOrThrow('S3_ACCESS_KEY_ID'),
          secretAccessKey: config.getOrThrow('S3_SECRET_ACCESS_KEY'),
        },
      })
      this.bucket = config.getOrThrow('S3_BUCKET')
    }
  }

  async summarizePost(postId: string): Promise<void> {
    if (!this.provider) return

    try {
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        select: {
          id: true,
          files: { select: { key: true, mimeType: true } },
          tags: { select: { tagId: true } },
        },
      })

      if (!post) return

      const supportedFiles = post.files.filter((f) => SUPPORTED_MIME_TYPES.includes(f.mimeType))
      if (supportedFiles.length === 0) return

      const textParts = await Promise.all(
        supportedFiles.map((f) => this.extractText(f.key, f.mimeType).catch(() => '')),
      )
      const text = textParts
        .map((t) => t.trim())
        .filter(Boolean)
        .join('\n\n')
      if (!text) return

      const summary = await this.callLlm(SUMMARY_PROMPT, text, 300)
      if (!summary) return

      await this.prisma.post.update({
        where: { id: postId },
        data: { summary, summarizedAt: new Date() },
      })

      this.logger.log(`Summarized post ${postId}`)

      // Auto-tag only if post has no existing tags
      if (post.tags.length === 0) {
        await this.autoTagPost(postId, summary)
      }
    } catch (err) {
      this.logger.warn(`Failed to summarize post ${postId}: ${(err as Error).message}`)
    }
  }

  private async autoTagPost(postId: string, summary: string): Promise<void> {
    try {
      const raw = await this.callLlm(TAGGING_PROMPT, summary, 100)
      if (!raw) return

      const tagNames = raw
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length >= 2 && t.length <= 40 && this.tagsService.validateTag(t))
        .slice(0, 5)

      if (tagNames.length === 0) return

      const tags = await Promise.all(tagNames.map((name) => this.tagsService.findOrCreate(name)))

      await this.prisma.postTag.createMany({
        data: tags.map((tag) => ({ postId, tagId: tag.id })),
        skipDuplicates: true,
      })

      this.logger.log(`Auto-tagged post ${postId} with: ${tagNames.join(', ')}`)
    } catch (err) {
      this.logger.warn(`Failed to auto-tag post ${postId}: ${(err as Error).message}`)
    }
  }

  async screenContent(postId: string): Promise<void> {
    if (!this.provider) return

    try {
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        select: {
          id: true,
          title: true,
          description: true,
          files: { select: { key: true, mimeType: true } },
        },
      })

      if (!post) return

      const parts: string[] = []
      if (post.title) parts.push(`Title: ${post.title}`)
      if (post.description) parts.push(`Description: ${post.description}`)

      // Include file text if available (first supported file only — quick scan)
      const supportedFile = post.files.find((f) => SUPPORTED_MIME_TYPES.includes(f.mimeType))
      if (supportedFile) {
        const fileText = await this.extractText(supportedFile.key, supportedFile.mimeType).catch(
          () => '',
        )
        if (fileText.trim()) parts.push(`File content excerpt:\n${fileText}`)
      }

      if (parts.length === 0) return

      const input = parts.join('\n\n')
      const result = await this.callLlm(SCREENING_PROMPT, input, 100)
      if (!result) return

      const trimmed = result.trim()
      if (trimmed.toUpperCase().startsWith('FLAG:')) {
        const reason = trimmed.slice(5).trim()
        await this.prisma.post.update({
          where: { id: postId },
          data: { contentWarning: reason },
        })
        this.logger.warn(`Content warning set on post ${postId}: ${reason}`)
      }
    } catch (err) {
      this.logger.warn(`Failed to screen post ${postId}: ${(err as Error).message}`)
    }
  }

  private async extractText(key: string, mimeType: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key })
    const response = await this.s3Client.send(command)
    const chunks: Uint8Array[] = []

    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }

    const buffer = Buffer.concat(chunks)

    let text: string

    if (mimeType === 'application/pdf') {
      const parser = new PDFParse({ data: new Uint8Array(buffer) })
      const result = await parser.getText()
      text = result.text
    } else {
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    }

    return text.slice(0, MAX_TEXT_CHARS)
  }

  private async callLlm(
    systemPrompt: string,
    userContent: string,
    maxTokens: number,
  ): Promise<string | null> {
    switch (this.provider) {
      case 'groq':
        return this.callGroq(systemPrompt, userContent, maxTokens)
      case 'gemini':
        return this.callGemini(systemPrompt, userContent)
      case 'ollama':
        return this.callOllama(systemPrompt, userContent, maxTokens)
      default:
        return null
    }
  }

  private async callGroq(
    systemPrompt: string,
    userContent: string,
    maxTokens: number,
  ): Promise<string | null> {
    const { default: Groq } = await import('groq-sdk')
    const client = new Groq({ apiKey: this.config.getOrThrow('AI_SUMMARY_API_KEY') })
    const model = this.config.get('AI_SUMMARY_MODEL') || 'llama-3.3-70b-versatile'

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: maxTokens,
    })

    return response.choices[0]?.message?.content?.trim() ?? null
  }

  private async callGemini(systemPrompt: string, userContent: string): Promise<string | null> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(this.config.getOrThrow('AI_SUMMARY_API_KEY'))
    const model = this.config.get('AI_SUMMARY_MODEL') || 'gemini-2.5-flash'

    const genModel = genAI.getGenerativeModel({
      model,
      systemInstruction: systemPrompt,
    })

    const result = await genModel.generateContent(userContent)
    return result.response.text().trim() || null
  }

  private async callOllama(
    systemPrompt: string,
    userContent: string,
    maxTokens: number,
  ): Promise<string | null> {
    const endpoint = this.config.get('AI_SUMMARY_ENDPOINT') ?? 'http://localhost:11434'
    const model = this.config.get('AI_SUMMARY_MODEL') || 'llama3.2'

    const response = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        options: { num_predict: maxTokens },
      }),
    })

    if (!response.ok) throw new Error(`Ollama responded with ${response.status}`)

    const data = (await response.json()) as { message?: { content?: string } }
    return data.message?.content?.trim() ?? null
  }
}
