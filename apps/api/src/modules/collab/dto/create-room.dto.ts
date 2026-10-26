import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsBase64,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator'
import { RoomVisibility } from '@/generated/prisma/client'

export class CreateCollabRoomDto {
  @ApiPropertyOptional({ description: 'Board key wrapped with the owner public key' })
  @ValidateIf((o) => o.encryptedOwnerKey !== undefined)
  @IsBase64()
  @Length(168, 168)
  encryptedOwnerKey?: string

  @ApiPropertyOptional({ description: 'Optional room title', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string

  @ApiPropertyOptional({ enum: RoomVisibility, description: 'Room visibility (default: OPEN)' })
  @IsOptional()
  @IsEnum(RoomVisibility)
  visibility?: RoomVisibility

  @ApiPropertyOptional({ description: 'Optional password to protect room on creation' })
  @ValidateIf((o) => o.password !== undefined && o.password !== null)
  @IsString()
  @MinLength(1)
  password?: string
}
