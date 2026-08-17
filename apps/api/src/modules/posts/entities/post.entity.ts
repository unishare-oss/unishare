import { IngestStatus, PostStatus, PostType, PostPublicationStatus } from '@/generated/prisma/enums'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class PostTagEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiProperty()
  slug: string

  @ApiProperty()
  color: string
}

export class PostAuthorDeptEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string
}

export class PostAuthorEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiPropertyOptional({ nullable: true, type: String })
  image: string | null

  @ApiPropertyOptional({ nullable: true, type: Number })
  enrollmentYear: number | null

  @ApiPropertyOptional({ nullable: true, type: PostAuthorDeptEntity })
  department: PostAuthorDeptEntity | null
}

export class PostCourseDeptEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string
}

export class PostCourseEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  code: string

  @ApiProperty()
  name: string

  @ApiProperty({ type: PostCourseDeptEntity })
  department: PostCourseDeptEntity
}

export class PostFileEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  key: string

  @ApiProperty()
  name: string

  @ApiProperty()
  size: number

  @ApiProperty()
  mimeType: string

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  downloads: number

  @ApiProperty({ enum: IngestStatus, enumName: 'IngestStatus' })
  ingestStatus: IngestStatus

  @ApiPropertyOptional({ nullable: true, type: Date })
  ingestedAt: Date | null
}

export class PostCountEntity {
  @ApiProperty()
  comments: number

  @ApiProperty()
  savedBy: number
}

export class PostEntity {
  @ApiProperty()
  id: string

  @ApiProperty({ enum: PostType, enumName: 'PostType' })
  type: PostType

  @ApiProperty({ enum: PostStatus, enumName: 'PostStatus' })
  status: PostStatus

  @ApiProperty({ enum: PostPublicationStatus, enumName: 'PostPublicationStatus' })
  publicationStatus: PostPublicationStatus

  @ApiProperty()
  trendingScore: number

  @ApiProperty({ default: false })
  isAnonymous: boolean

  @ApiPropertyOptional({ nullable: true, type: String })
  title: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  description: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  externalUrl: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  summary: string | null

  @ApiPropertyOptional({ nullable: true, type: Date })
  summarizedAt: Date | null

  @ApiPropertyOptional({ nullable: true, type: String })
  contentWarning: string | null

  @ApiPropertyOptional({ nullable: true, type: Number })
  examYear: number | null

  @ApiPropertyOptional({ nullable: true, type: Number })
  moduleNumber: number | null

  @ApiPropertyOptional({ nullable: true, type: Number })
  year: number | null

  @ApiPropertyOptional({ nullable: true, type: Number })
  semester: number | null

  @ApiProperty()
  shortCode: string

  @ApiProperty()
  isOwner: boolean

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date

  @ApiPropertyOptional({ nullable: true, type: PostAuthorEntity })
  author?: PostAuthorEntity | null

  @ApiProperty({ type: PostCourseEntity })
  course: PostCourseEntity

  @ApiProperty({ type: [PostFileEntity] })
  files: PostFileEntity[]

  @ApiProperty({ type: PostCountEntity })
  _count: PostCountEntity

  @ApiProperty()
  savedByCurrentUser: boolean

  @ApiProperty()
  views: number

  // `type: Object` erases the value type, so Orval emitted `{ [key: string]: unknown }` and every
  // count had to be cast before arithmetic. additionalProperties keeps the map shape AND says
  // what the values are.
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    description: 'Map of ReactionType to count',
  })
  reactionCounts: Record<string, number>

  @ApiPropertyOptional({ nullable: true, type: String })
  userReaction: string | null

  @ApiProperty({ type: [PostTagEntity] })
  tags: PostTagEntity[]
}

export class PostDetailEntity extends PostEntity {}
