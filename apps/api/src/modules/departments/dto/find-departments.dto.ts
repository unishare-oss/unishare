import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class FindDepartmentsDto {
  @ApiPropertyOptional({ description: 'Only departments of this university' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  universityId?: string
}
