import { ApiProperty } from '@nestjs/swagger'
import { ArrayMaxSize, IsArray, IsNotEmpty, IsString } from 'class-validator'

export class SaveMyCoursesDto {
  @ApiProperty({ type: [String], maxItems: 200 })
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  courseIds: string[]
}
