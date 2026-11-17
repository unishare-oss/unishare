import { ApiProperty } from '@nestjs/swagger'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

export class SuggestCourseFileDto {
  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  key: string

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  mimeType: string
}

export class SuggestCoursesDto {
  @ApiProperty()
  @IsString()
  departmentId: string

  @ApiProperty({ type: [SuggestCourseFileDto], maxItems: 10 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SuggestCourseFileDto)
  files: SuggestCourseFileDto[]
}
