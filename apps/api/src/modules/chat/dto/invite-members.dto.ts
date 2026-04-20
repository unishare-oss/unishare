import { IsArray, IsString, ArrayMinSize, IsOptional, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { EncryptedRoomKeyDto } from './create-room.dto'

export class InviteMembersDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  userIds: string[]

  @ApiPropertyOptional({ type: [EncryptedRoomKeyDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EncryptedRoomKeyDto)
  @IsOptional()
  encryptedRoomKeys?: EncryptedRoomKeyDto[]
}
