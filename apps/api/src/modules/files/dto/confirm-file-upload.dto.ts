import { IsInt, IsString, MaxLength, Min } from 'class-validator'

export class ConfirmFileUploadDto {
  @IsString()
  @MaxLength(500)
  key: string

  @IsString()
  @MaxLength(255)
  name: string

  @IsInt()
  @Min(1)
  size: number

  @IsString()
  @MaxLength(255)
  mimeType: string
}
