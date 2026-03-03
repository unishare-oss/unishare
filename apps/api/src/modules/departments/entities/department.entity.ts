import { ApiProperty } from '@nestjs/swagger'

export class DeptCourseEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  code: string

  @ApiProperty()
  name: string
}

export class DepartmentEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiProperty()
  code: string
}

export class DepartmentWithCoursesEntity extends DepartmentEntity {
  @ApiProperty({ type: [DeptCourseEntity] })
  courses: DeptCourseEntity[]
}
