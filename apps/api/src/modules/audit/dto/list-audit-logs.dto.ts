import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { AUDIT_ACTIONS, AUDIT_CATEGORIES, AuditActionValue, AuditCategory } from '../audit.actions'

export class ListAuditLogsDto {
  @ApiPropertyOptional({ enum: AUDIT_ACTIONS, description: 'Filter by action' })
  @IsOptional()
  @IsIn(AUDIT_ACTIONS)
  action?: AuditActionValue

  @ApiPropertyOptional({
    enum: AUDIT_CATEGORIES,
    description: 'Filter by action group, e.g. user matches user.ban and user.set_role',
  })
  @IsOptional()
  @IsIn(AUDIT_CATEGORIES)
  category?: AuditCategory

  @ApiPropertyOptional({ description: 'Filter by acting user id' })
  @IsOptional()
  @IsString()
  actorId?: string

  @ApiPropertyOptional({ description: 'Filter by target type, e.g. post, user, report' })
  @IsOptional()
  @IsString()
  targetType?: string

  @ApiPropertyOptional({ description: 'Filter by target id' })
  @IsOptional()
  @IsString()
  targetId?: string

  @ApiPropertyOptional({ description: 'Only entries at or after this ISO timestamp' })
  @IsOptional()
  @IsDateString()
  from?: string

  @ApiPropertyOptional({ description: 'Only entries at or before this ISO timestamp' })
  @IsOptional()
  @IsDateString()
  to?: string

  @ApiPropertyOptional({ type: Number, description: 'Page number (1-indexed)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @ApiPropertyOptional({ type: Number, description: 'Results per page (max 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number
}
