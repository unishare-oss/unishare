import { IsEnum, IsArray, IsString, IsOptional, ArrayMinSize } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ChatRoomType } from '@/generated/prisma/client'

export class CreateRoomDto {
  @ApiProperty({ enum: ChatRoomType })
  @IsEnum(ChatRoomType)
  type: ChatRoomType

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  participantIds: string[]

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string
}
