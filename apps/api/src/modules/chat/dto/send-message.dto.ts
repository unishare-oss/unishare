import { IsString, IsOptional, IsEnum, IsUrl } from 'class-validator'
import { ChatMessageType } from '@prisma/client'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class SendMessageDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  content?: string

  @ApiPropertyOptional({ enum: ChatMessageType })
  @IsEnum(ChatMessageType)
  @IsOptional()
  type?: ChatMessageType

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  imageUrl?: string

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  linkUrl?: string
}
