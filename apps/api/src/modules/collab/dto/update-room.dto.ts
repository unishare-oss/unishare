import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsBase64,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MinLength,
  ValidateIf,
} from 'class-validator'
import { RoomVisibility } from '@/generated/prisma/client'

export class UpdateRoomDto {
  @ApiPropertyOptional({ description: 'Board key wrapped with the owner public key' })
  @ValidateIf((o) => o.encryptedOwnerKey !== undefined)
  @IsBase64()
  @Length(168, 168)
  encryptedOwnerKey?: string

  @ApiPropertyOptional({ enum: ['OPEN', 'VIEW_ONLY', 'PRIVATE'] })
  @IsOptional()
  @IsEnum(RoomVisibility)
  visibility?: RoomVisibility

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string

  @ApiPropertyOptional({
    type: 'string',
    nullable: true,
    description: 'Set/change password (string) or remove (null)',
  })
  @IsOptional()
  @ValidateIf((o) => o.password !== null)
  @IsString()
  @MinLength(1)
  password?: string | null
}
