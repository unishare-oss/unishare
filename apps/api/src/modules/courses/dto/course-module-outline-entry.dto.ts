import { ApiProperty } from '@nestjs/swagger'
import { ArrayMaxSize, IsArray, IsInt, IsString, Max, Min, MinLength } from 'class-validator'

export class CourseModuleOutlineEntryDto {
  @ApiProperty({ minimum: 1, maximum: 3 })
  @IsInt()
  @Min(1)
  @Max(3)
  moduleNumber: number

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  topics: string[]
}
