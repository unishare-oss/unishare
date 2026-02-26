import { IsString, MinLength } from 'class-validator'

export class CreateCourseDto {
  @IsString()
  @MinLength(2)
  code: string

  @IsString()
  @MinLength(2)
  name: string

  @IsString()
  departmentId: string
}
