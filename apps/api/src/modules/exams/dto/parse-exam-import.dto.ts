import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class ParseExamImportDto {
  @ApiPropertyOptional({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  universityId?: string
}
