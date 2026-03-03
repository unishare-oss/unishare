import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsString, MaxLength, Min } from 'class-validator'

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
}
