import { IsString, IsOptional, IsEnum, IsUrl } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { ChatMessageType } from '@/generated/prisma/client'

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
