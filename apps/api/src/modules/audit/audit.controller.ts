import { Controller, Get, Query } from '@nestjs/common'
import { ApiForbiddenResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Roles } from '@thallesp/nestjs-better-auth'
import { AuditService } from './audit.service'
import { ListAuditLogsDto } from './dto/list-audit-logs.dto'
import { PaginatedAuditLogsEntity } from './entities/audit-log.entity'

@ApiTags('admin')
@Controller('admin/audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(['ADMIN'])
  @ApiOkResponse({ type: PaginatedAuditLogsEntity })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  async list(@Query() filters: ListAuditLogsDto) {
    return this.auditService.list(filters)
  }
}
