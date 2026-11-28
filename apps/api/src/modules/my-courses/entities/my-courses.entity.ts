import { ApiProperty, PickType } from '@nestjs/swagger'
import { CourseEntity } from '@/modules/courses/entities/course.entity'

export class MyCourseEntity extends PickType(CourseEntity, [
  'id',
  'code',
  'name',
  'yearLevel',
] as const) {}

export class MyCoursesEntity {
  @ApiProperty()
  academicYear: number

  @ApiProperty({ type: [MyCourseEntity] })
  automatic: MyCourseEntity[]

  @ApiProperty({ type: [MyCourseEntity] })
  removed: MyCourseEntity[]

  @ApiProperty({ type: [MyCourseEntity] })
  added: MyCourseEntity[]

  @ApiProperty({ type: [MyCourseEntity] })
  final: MyCourseEntity[]

  @ApiProperty()
  confirmed: boolean
}
