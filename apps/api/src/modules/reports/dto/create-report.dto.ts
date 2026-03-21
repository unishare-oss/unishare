import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ReportReason } from '@/generated/prisma/client'

export class CreateReportDto {
  @ApiProperty({ enum: ReportReason, description: 'Reason for report' })
  @IsEnum(ReportReason)
  reason: ReportReason

  @ApiPropertyOptional({ description: 'Optional context/details for the report' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string
}
