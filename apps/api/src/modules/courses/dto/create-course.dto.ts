import { IsString, MaxLength, MinLength } from 'class-validator'

export class CreateCourseDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  code: string

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string

  @IsString()
  departmentId: string
}
