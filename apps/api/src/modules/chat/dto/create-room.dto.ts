import { IsEnum, IsArray, IsString, IsOptional, ArrayMinSize } from 'class-validator'
import { ChatRoomType } from '@prisma/client'

export class CreateRoomDto {
  @IsEnum(ChatRoomType)
  type: ChatRoomType

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  participantIds: string[]

  @IsString()
  @IsOptional()
  name?: string
}
