import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ReportReason, ReportStatus } from '@/generated/prisma/client'

export class ReportAdminActionEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  action: string

  @ApiPropertyOptional({ nullable: true, type: String })
  reason: string | null

  @ApiProperty()
  createdAt: Date
}

export class ReportPostDepartmentEntity {
  @ApiProperty()
  name: string
}

export class ReportPostCourseEntity {
  @ApiProperty()
  code: string

  @ApiProperty({ type: ReportPostDepartmentEntity })
  department: ReportPostDepartmentEntity
}

export class ReportPostAuthorEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string
}

export class ReportPostEntity {
  @ApiProperty()
  id: string

  @ApiPropertyOptional({ nullable: true, type: String })
  title: string | null

  @ApiProperty()
  type: string

  @ApiProperty({ type: ReportPostCourseEntity })
  course: ReportPostCourseEntity

  @ApiPropertyOptional({ nullable: true, type: ReportPostAuthorEntity })
  author: ReportPostAuthorEntity | null
}

export class ReportReporterEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string
}

export class ReportDetail {
  @ApiProperty()
  id: string

  @ApiProperty()
  postId: string

  @ApiProperty()
  userId: string

  @ApiProperty({ enum: ReportReason })
  reason: ReportReason

  @ApiPropertyOptional({ nullable: true, type: String })
  comment: string | null

  @ApiProperty({ enum: ReportStatus })
  status: ReportStatus

  @ApiProperty()
  createdAt: Date

  @ApiPropertyOptional({ nullable: true, type: ReportPostEntity })
  post: ReportPostEntity | null

  @ApiPropertyOptional({ nullable: true, type: ReportReporterEntity })
  reporter: ReportReporterEntity | null

  @ApiPropertyOptional({ nullable: true, type: ReportAdminActionEntity })
  adminAction: ReportAdminActionEntity | null
}

export class PaginatedReportsEntity {
  @ApiProperty({ type: [ReportDetail] })
  reports: ReportDetail[]

  @ApiProperty()
  total: number

  @ApiProperty()
  page: number

  @ApiProperty()
  limit: number
}
