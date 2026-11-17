import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class ConfirmFileUploadDto {
  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  key: string

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  size: number

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  mimeType: string

  @ApiPropertyOptional({ description: 'Claim an owner-bound web upload created before Share' })
  @IsOptional()
  @IsBoolean()
  preShare?: boolean
}
