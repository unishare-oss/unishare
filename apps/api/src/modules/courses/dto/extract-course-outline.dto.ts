import { ApiProperty } from '@nestjs/swagger'
import { IsString, MinLength } from 'class-validator'

export class ExtractCourseOutlineDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  key: string

  @ApiProperty()
  @IsString()
  @MinLength(1)
  mimeType: string
}
