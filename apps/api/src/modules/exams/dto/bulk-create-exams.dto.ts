import { ApiProperty } from '@nestjs/swagger'
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { CreateExamDto } from './create-exam.dto'

export class BulkCreateExamsDto {
  @ApiProperty({ type: [CreateExamDto], maxItems: 500 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateExamDto)
  exams: CreateExamDto[]
}
