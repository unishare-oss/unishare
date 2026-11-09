import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class FindFacultiesDto {
  @ApiPropertyOptional({ description: 'Only faculties of this university' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  universityId?: string
}
