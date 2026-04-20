import {
  IsEnum,
  IsArray,
  IsString,
  IsOptional,
  ArrayMinSize,
  MaxLength,
  IsUrl,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ChatRoomType } from '@/generated/prisma/client'

export class EncryptedRoomKeyDto {
  @ApiProperty()
  @IsString()
  userId: string

  @ApiProperty()
  @IsString()
  encryptedKey: string
}

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

  @ApiPropertyOptional({ maxLength: 500 })
  @IsUrl({ protocols: ['https'] })
  @MaxLength(500)
  @IsOptional()
  imageUrl?: string

  @ApiPropertyOptional({ type: [EncryptedRoomKeyDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EncryptedRoomKeyDto)
  @IsOptional()
  encryptedRoomKeys?: EncryptedRoomKeyDto[]
}
