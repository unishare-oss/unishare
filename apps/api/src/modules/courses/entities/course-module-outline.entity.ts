import { ApiProperty } from '@nestjs/swagger'

export class CourseModuleOutlineEntity {
  @ApiProperty()
  moduleNumber: number

  @ApiProperty({ type: [String] })
  topics: string[]
}
