import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ReportReason, ReportStatus } from '@/generated/prisma/client'

export class ReportDetail {
  @ApiProperty()
  id: string

  @ApiProperty()
  postId: string

  @ApiProperty()
  userId: string

  @ApiProperty({ enum: ReportReason })
  reason: ReportReason

  @ApiPropertyOptional()
  comment?: string

  @ApiProperty({ enum: ReportStatus })
  status: ReportStatus

  @ApiProperty()
  createdAt: Date

  @ApiPropertyOptional()
  adminAction?: {
    id: string
    action: string
    reason?: string
    createdAt: Date
  }
}
