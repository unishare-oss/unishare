import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsOptional, IsString } from 'class-validator'

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
}
