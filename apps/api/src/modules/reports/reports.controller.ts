import { Controller, Post, Get, Patch, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiForbiddenResponse, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger'
import { Session, Roles } from '@thallesp/nestjs-better-auth'
import { UserSession } from '@/auth/auth.config'
import { ReportsService } from './reports.service'
import { CreateReportDto } from './dto/create-report.dto'
import { ListReportsDto } from './dto/list-reports.dto'
import { PaginatedReportsEntity, ReportDetail } from './entities/report.entity'

@ApiTags('reports')
@Controller('posts')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post(':id/report')
  @ApiCreatedResponse({ type: ReportDetail })
  async reportPost(
    @Param('id') postId: string,
    @Body() dto: CreateReportDto,
    @Session() session: UserSession,
  ) {
    return this.reportsService.createReport(postId, session.user.id, dto)
  }
}

@ApiTags('admin')
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @Roles(['ADMIN'])
  @ApiOkResponse({ type: PaginatedReportsEntity })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  async listReports(@Query() filters: ListReportsDto) {
    return this.reportsService.listReports(filters)
  }

  @Patch(':id/approve')
  @Roles(['ADMIN'])
  @ApiOkResponse({ type: ReportDetail })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  async approveReport(
    @Param('id') reportId: string,
    @Body() body: { reason?: string },
    @Session() session: UserSession,
  ) {
    return this.reportsService.approveReport(reportId, session.user.id, body.reason)
  }

  @Patch(':id/reject')
  @Roles(['ADMIN'])
  @ApiOkResponse({ type: ReportDetail })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  async rejectReport(
    @Param('id') reportId: string,
    @Body() body: { reason?: string },
    @Session() session: UserSession,
  ) {
    return this.reportsService.rejectReport(reportId, session.user.id, body.reason)
  }
}
