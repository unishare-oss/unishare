import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class UpdateAcademicProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  departmentId?: string | null

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  enrollmentYear?: number | null
}
