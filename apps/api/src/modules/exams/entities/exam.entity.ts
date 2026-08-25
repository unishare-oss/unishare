import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { CourseDeptEntity } from '@/modules/courses/entities/course.entity'

class ExamCourseEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  code: string

  @ApiProperty()
  name: string

  @ApiProperty({ type: CourseDeptEntity })
  department: CourseDeptEntity
}

export class ExamEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  title: string

  @ApiPropertyOptional({ nullable: true, type: String })
  examRoom: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  notes: string | null

  @ApiProperty()
  startsAt: Date

  @ApiPropertyOptional({ nullable: true, type: Date })
  endsAt: Date | null

  @ApiProperty()
  createdBy: string

  @ApiProperty({ type: ExamCourseEntity })
  course: ExamCourseEntity

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}
