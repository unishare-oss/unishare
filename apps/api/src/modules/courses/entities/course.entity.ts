import { ApiProperty } from '@nestjs/swagger'

export class CourseDeptEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiProperty()
  code: string
}

export class CourseEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  code: string

  @ApiProperty()
  name: string

  @ApiProperty()
  departmentId: string

  @ApiProperty({ type: CourseDeptEntity })
  department: CourseDeptEntity
}

export class PaginatedCourseEntity {
  @ApiProperty({ type: [CourseEntity] })
  items: CourseEntity[]

  @ApiProperty()
  total: number

  @ApiProperty()
  page: number

  @ApiProperty()
  limit: number

  @ApiProperty()
  totalPages: number
}
