import { IsInt, IsOptional, IsString, IsUrl, Max, Min, MaxLength } from 'class-validator'

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  image?: string

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  enrollmentYear?: number
}
