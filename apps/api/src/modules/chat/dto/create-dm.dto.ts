import { IsString, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateDMDto {
  @ApiProperty({ description: 'User ID to start DM with' })
  @IsString()
  userId: string

  @ApiPropertyOptional({ description: 'Initial message to send with DM creation' })
  @IsString()
  @IsOptional()
  initialMessage?: string
}
