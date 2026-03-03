import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class UpdateAcademicProfileDto {
  @ApiPropertyOptional({ nullable: true, type: String, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  departmentId?: string | null

  @ApiPropertyOptional({ nullable: true, type: Number, minimum: 1950, maximum: 2100 })
  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  enrollmentYear?: number | null
}
