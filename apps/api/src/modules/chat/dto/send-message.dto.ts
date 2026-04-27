import { IsString, IsOptional, IsEnum, IsUrl, ValidateIf, IsNotEmpty } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { ChatMessageType } from '@/generated/prisma/client'

export class SendMessageDto {
  @ApiPropertyOptional()
  @ValidateIf((o) => !o.imageUrl && !o.linkUrl && !o.fileUrl)
  @IsString()
  @IsNotEmpty()
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
  fileUrl?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fileName?: string

  // reserved for future use — no client currently sends this field
  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  linkUrl?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string
}
