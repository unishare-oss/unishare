import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator'
import { CourseModuleOutlineEntryDto } from './course-module-outline-entry.dto'

export class ReplaceCourseOutlineDto {
  @ApiProperty({ type: [CourseModuleOutlineEntryDto] })
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => CourseModuleOutlineEntryDto)
  modules: CourseModuleOutlineEntryDto[]
}
