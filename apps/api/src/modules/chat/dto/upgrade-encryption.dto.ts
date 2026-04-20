import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'
import { EncryptedRoomKeyDto } from './create-room.dto'

export class UpgradeEncryptionDto {
  @ApiProperty({ type: [EncryptedRoomKeyDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EncryptedRoomKeyDto)
  encryptedRoomKeys: EncryptedRoomKeyDto[]
}
