import { ApiProperty } from '@nestjs/swagger'

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
