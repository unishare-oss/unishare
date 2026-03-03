import { ApiProperty } from '@nestjs/swagger'
import { IsString, MaxLength, MinLength } from 'class-validator'

export class CreateCourseDto {
  @ApiProperty({ minLength: 2, maxLength: 20 })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  code: string

  @ApiProperty({ minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string

  @ApiProperty()
  @IsString()
  departmentId: string
}
