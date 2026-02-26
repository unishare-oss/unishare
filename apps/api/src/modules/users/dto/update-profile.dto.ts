import { IsOptional, IsString, IsUrl } from 'class-validator'

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsUrl()
  image?: string
}
