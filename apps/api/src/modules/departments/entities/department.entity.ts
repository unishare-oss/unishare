import { ApiProperty } from '@nestjs/swagger'

export class DeptCourseEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  code: string

  @ApiProperty()
  name: string
}

export class DepartmentFacultyEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiProperty()
  universityId: string
}

export class DepartmentEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiProperty()
  courseCount: number

  @ApiProperty({ type: DepartmentFacultyEntity })
  faculty: DepartmentFacultyEntity
}

export class DepartmentWithCoursesEntity extends DepartmentEntity {
  @ApiProperty({ type: [DeptCourseEntity] })
  courses: DeptCourseEntity[]
}
