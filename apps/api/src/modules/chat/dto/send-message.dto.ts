import { IsString, IsOptional, IsEnum, IsUrl } from 'class-validator'
import { ChatMessageType } from '@prisma/client'

export class SendMessageDto {
  @IsString()
  @IsOptional()
  content?: string

  @IsEnum(ChatMessageType)
  @IsOptional()
  type?: ChatMessageType

  @IsUrl()
  @IsOptional()
  imageUrl?: string

  @IsUrl()
  @IsOptional()
  linkUrl?: string
}
