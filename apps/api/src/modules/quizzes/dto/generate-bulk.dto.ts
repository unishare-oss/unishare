import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class GenerateBulkDto {
  @ApiProperty({ description: 'Course to generate one quiz per outlined module for' })
  @IsString()
  courseId: string
}
