import { IsEnum, IsArray, IsString, IsOptional, ArrayMinSize, MaxLength } from 'class-validator'
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

  @ApiPropertyOptional({ maxLength: 30 })
  @IsString()
  @MaxLength(30)
  @IsOptional()
  name?: string
}
