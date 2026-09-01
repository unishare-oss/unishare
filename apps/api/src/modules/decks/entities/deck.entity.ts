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
  @ApiProperty({ description: 'When the daily allowance resets' }) resetsAt: Date
}

export class DeckDownloadEntity {
  @ApiProperty() url: string
  @ApiProperty() expiresIn: number
}
