import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { FeedbackType } from '@/generated/prisma/client'

export class FeedbackUserEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string
}

export class FeedbackEntity {
  @ApiProperty()
  id: string

  @ApiProperty({ enum: FeedbackType })
  type: FeedbackType

  @ApiProperty()
  message: string

  @ApiProperty()
  createdAt: Date

  @ApiPropertyOptional({ nullable: true, type: FeedbackUserEntity })
  user: FeedbackUserEntity | null
}

export class PaginatedFeedbackEntity {
  @ApiProperty({ type: [FeedbackEntity] })
  items: FeedbackEntity[]

  @ApiProperty()
  total: number

  @ApiProperty()
  page: number

  @ApiProperty()
  limit: number
}
