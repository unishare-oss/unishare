import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ForbiddenException,
} from '@nestjs/common'
import { ApiTags, ApiResponse, ApiBearerAuth, ApiForbiddenResponse } from '@nestjs/swagger'
import { Session } from '@thallesp/nestjs-better-auth'
import { UserSession } from '@/auth/auth.config'
import { ReportsService } from './reports.service'
import { CreateReportDto } from './dto/create-report.dto'
import { ListReportsDto } from './dto/list-reports.dto'
import { ReportDetail } from './entities/report.entity'

@ApiTags('reports')
@Controller('posts')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Submit a report for a post.
   * Requires authentication.
   */
  @Post(':id/report')
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        success: true,
        data: {
          id: 'report123',
          postId: 'post456',
          userId: 'user789',
          reason: 'SPAM',
          status: 'PENDING',
          createdAt: '2026-03-19T12:00:00Z',
        },
      },
    },
  })
  async reportPost(
    @Param('id') postId: string,
    @Body() dto: CreateReportDto,
    @Session() session: UserSession,
  ): Promise<{ success: boolean; data: ReportDetail }> {
    const report = await this.reportsService.createReport(postId, session.user.id, dto)

    return {
      success: true,
      data: report as ReportDetail,
    }
  }
}

@ApiTags('admin')
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * List reports with filters.
   * Admin-only access.
   */
  @Get()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        data: {
          reports: [],
          total: 5,
          page: 1,
          limit: 20,
        },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  async listReports(
    @Query() filters: ListReportsDto,
    @Session() session: UserSession,
  ): Promise<{ success: boolean; data: any }> {
    if (session?.user?.role !== 'admin') {
      throw new ForbiddenException('Admin role required')
    }

    const result = await this.reportsService.listReports(filters)

    return {
      success: true,
      data: result,
    }
  }

  /**
   * Approve a report.
   * Admin-only access.
   */
  @Patch(':id/approve')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        data: {
          id: 'report123',
          status: 'APPROVED',
        },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  async approveReport(
    @Param('id') reportId: string,
    @Body() body: { reason?: string },
    @Session() session: UserSession,
  ): Promise<{ success: boolean; data: ReportDetail }> {
    if (session?.user?.role !== 'admin') {
      throw new ForbiddenException('Admin role required')
    }

    const report = await this.reportsService.approveReport(reportId, session.user.id, body.reason)

    return {
      success: true,
      data: report as ReportDetail,
    }
  }

  /**
   * Reject a report.
   * Admin-only access.
   */
  @Patch(':id/reject')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        data: {
          id: 'report123',
          status: 'REJECTED',
        },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  async rejectReport(
    @Param('id') reportId: string,
    @Body() body: { reason?: string },
    @Session() session: UserSession,
  ): Promise<{ success: boolean; data: ReportDetail }> {
    if (session?.user?.role !== 'admin') {
      throw new ForbiddenException('Admin role required')
    }

    const report = await this.reportsService.rejectReport(reportId, session.user.id, body.reason)

    return {
      success: true,
      data: report as ReportDetail,
    }
  }
}
