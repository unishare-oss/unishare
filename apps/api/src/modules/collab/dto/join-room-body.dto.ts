import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class JoinRoomBodyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string

  @ApiPropertyOptional({
    description: 'Sentinel from sessionStorage — skip password check if true (D-22)',
  })
  @IsOptional()
  @IsBoolean()
  pwVerified?: boolean
}
