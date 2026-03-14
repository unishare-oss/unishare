import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PostRequestStatus } from '@/generated/prisma/enums'
import { PaginatedResult } from '@unishare/types'

export class PostRequestAuthorEntity {
  @ApiProperty() id: string
  @ApiProperty() name: string
  @ApiPropertyOptional({ nullable: true, type: String }) image: string | null
}

export class PostRequestCourseEntity {
  @ApiProperty() id: string
  @ApiProperty() code: string
  @ApiProperty() name: string
}

export class PostRequestFulfilledByEntity {
  @ApiProperty() id: string
  @ApiPropertyOptional({ nullable: true, type: String }) title: string | null
  @ApiProperty() shortCode: string
}

export class PostRequestEntity {
  @ApiProperty() id: string
  @ApiProperty() title: string
  @ApiPropertyOptional({ nullable: true, type: String }) description: string | null
  @ApiProperty({ enum: PostRequestStatus }) status: PostRequestStatus
  @ApiProperty() createdAt: Date
  @ApiProperty() updatedAt: Date
  @ApiProperty() upvoteCount: number
  @ApiProperty() isUpvoted: boolean
  @ApiPropertyOptional({ nullable: true, type: PostRequestAuthorEntity })
  author: PostRequestAuthorEntity | null
  @ApiProperty({ type: PostRequestCourseEntity }) course: PostRequestCourseEntity
  @ApiPropertyOptional({ nullable: true, type: PostRequestFulfilledByEntity })
  fulfilledByPost: PostRequestFulfilledByEntity | null
}

export class PaginatedPostRequestEntity implements PaginatedResult<PostRequestEntity> {
  @ApiProperty({ type: [PostRequestEntity] }) items: PostRequestEntity[]
  @ApiProperty() total: number
  @ApiProperty() page: number
  @ApiProperty() limit: number
  @ApiProperty() totalPages: number
}
