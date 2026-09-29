import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class AuditLogEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  createdAt: Date

  @ApiPropertyOptional({ nullable: true, type: String })
  actorId: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  actorName: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  actorRole: string | null

  @ApiProperty({ description: 'Dotted <target>.<verb>, e.g. post.delete' })
  action: string

  @ApiPropertyOptional({ nullable: true, type: String })
  targetType: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  targetId: string | null

  @ApiPropertyOptional({
    nullable: true,
    type: 'object',
    additionalProperties: true,
    description: 'Action-specific details',
  })
  metadata: Record<string, unknown> | null

  @ApiPropertyOptional({ nullable: true, type: String })
  ip: string | null
}

export class PaginatedAuditLogsEntity {
  @ApiProperty({ type: [AuditLogEntity] })
  logs: AuditLogEntity[]

  @ApiProperty()
  total: number

  @ApiProperty()
  page: number

  @ApiProperty()
  limit: number
}
