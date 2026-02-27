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

export class PostCommentUserEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiPropertyOptional({ nullable: true, type: String })
  image: string | null
}

export class PostCommentEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  content: string

  @ApiProperty()
  createdAt: Date

  @ApiPropertyOptional({ nullable: true, type: Date })
  deletedAt: Date | null

  @ApiProperty({ type: PostCommentUserEntity })
  user: PostCommentUserEntity
}

export class PostEntity {
  @ApiProperty()
  id: string

  @ApiProperty({ enum: ['NOTE', 'OLD_QUESTION'] })
  type: string

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  status: string

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

  @ApiProperty()
  authorId: string

  @ApiProperty()
  courseId: string

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date

  @ApiPropertyOptional({ nullable: true, type: Date })
  deletedAt: Date | null

  @ApiProperty({ type: PostAuthorEntity })
  author: PostAuthorEntity

  @ApiProperty({ type: PostCourseEntity })
  course: PostCourseEntity

  @ApiProperty({ type: [PostFileEntity] })
  files: PostFileEntity[]

  @ApiProperty({ type: PostCountEntity })
  _count: PostCountEntity

  @ApiProperty()
  savedByCurrentUser: boolean
}

export class PostDetailEntity extends PostEntity {
  @ApiProperty({ type: [PostCommentEntity] })
  comments: PostCommentEntity[]
}
