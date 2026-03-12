import { PostStatus, PostType } from '@/generated/prisma/enums'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

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
  postId: string

  @ApiProperty()
  createdAt: Date
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

  @ApiProperty({ default: false })
  isAnonymous: boolean

  @ApiPropertyOptional({ nullable: true, type: String })
  title: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  description: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  externalUrl: string | null

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

  @ApiPropertyOptional({ nullable: true, type: String })
  authorId?: string | null

  @ApiProperty()
  courseId: string

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date

  @ApiPropertyOptional({ nullable: true, type: Date })
  deletedAt: Date | null

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

  @ApiProperty({ type: Object, description: 'Map of ReactionType to count' })
  reactionCounts: Record<string, number>

  @ApiPropertyOptional({ nullable: true, type: String })
  userReaction: string | null
}

export class PostDetailEntity extends PostEntity {}
