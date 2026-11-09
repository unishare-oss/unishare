import { ApiHideProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  Allow,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

export class UpdateAcademicProfileDto {
  @ApiPropertyOptional({ nullable: true, type: String, maxLength: 50 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  departmentId?: string | null

  /** Not settable: only let through so the service can answer 400 instead of the pipe dropping it. */
  @ApiHideProperty()
  @Allow()
  universityId?: unknown

  @ApiPropertyOptional({ nullable: true, type: Number, minimum: 1950, maximum: 2100 })
  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  enrollmentYear?: number | null
}
