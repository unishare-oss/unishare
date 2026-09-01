import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { DeckStatus } from '@/generated/prisma/client'

export class DeckEntity {
  @ApiProperty() id: string
  @ApiProperty({ enum: DeckStatus }) status: DeckStatus
  @ApiProperty() prompt: string
  @ApiPropertyOptional({ type: String, nullable: true }) title: string | null
  @ApiProperty() slideCount: number
  @ApiProperty() language: string
  @ApiProperty() template: string
  @ApiPropertyOptional({ type: String, nullable: true }) error: string | null
  @ApiProperty() createdAt: Date
  @ApiPropertyOptional({ type: Date, nullable: true }) completedAt: Date | null

  /**
   * How many jobs sit ahead of this one, and a rough wait. Present only while QUEUED —
   * once the job is active there is nothing ahead of it and the UI should show phase instead.
   */
  @ApiPropertyOptional({ type: Number, nullable: true }) queueAhead: number | null
  @ApiPropertyOptional({ type: Number, nullable: true }) etaSeconds: number | null
  @ApiPropertyOptional({
    type: Boolean,
    nullable: true,
    description: 'True when the exact position is beyond the scan limit',
  })
  queueAheadIsApproximate: boolean | null

  @ApiProperty({ description: 'A PDF render exists, so the deck can be previewed in-app' })
  hasPdf: boolean

  @ApiProperty({ description: 'The generator can still act on this deck' })
  canEdit: boolean

  @ApiProperty() tone: string
  @ApiProperty() verbosity: string

  @ApiPropertyOptional({
    type: Date,
    nullable: true,
    description: "Set when the deck is held until the owner's allowance frees up",
  })
  scheduledFor: Date | null

  @ApiProperty({ description: 'Attempts made so far' }) attempts: number
  @ApiProperty({ description: 'Attempts before the deck is given up on' }) maxAttempts: number
}

export class DeckTemplateEntity {
  @ApiProperty() id: string
  @ApiProperty() name: string
  @ApiPropertyOptional({ type: String, nullable: true }) description: string | null
}

export class DeckSlideEntity {
  @ApiProperty() id: string
  @ApiProperty() index: number
  @ApiProperty() layout: string
  @ApiProperty({
    description: 'Layout-defined content object. Walked generically by the editor.',
    type: 'object',
    additionalProperties: true,
  })
  content: unknown
}

export class PaginatedDecksEntity {
  @ApiProperty({ type: [DeckEntity] }) data: DeckEntity[]
  @ApiProperty() total: number
  @ApiProperty() page: number
  @ApiProperty() limit: number
}

export class DeckQuotaEntity {
  @ApiProperty() used: number
  @ApiProperty() limit: number
  @ApiProperty({ description: 'When the oldest slot in the window frees' }) resetsAt: Date

  @ApiPropertyOptional({
    type: Date,
    nullable: true,
    description: 'When a deck submitted now would start. Null while under quota.',
  })
  nextSlotAt: Date | null
}

export class DeckDownloadEntity {
  @ApiProperty() url: string
  @ApiProperty() expiresIn: number
}
