import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator'

export class ListExamsDto {
  @ApiProperty()
  @IsDateString()
  from: string

  @ApiProperty()
  @IsDateString()
  to: string

  @ApiPropertyOptional({ required: false })
  @IsOptional()
  @IsString()
  departmentId?: string

  @ApiPropertyOptional({ required: false })
  @IsOptional()
  @IsString()
  courseId?: string

  @ApiPropertyOptional({
    description: "Only exams for courses in the signed-in student's final list this year",
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  mine?: boolean
}
