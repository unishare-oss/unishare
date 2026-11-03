import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { Prisma } from '@/generated/prisma/client'
import { postInScope, UniversityScope } from '@/common/university-scope'
import { CreateReportDto } from './dto/create-report.dto'
import { ListReportsDto } from './dto/list-reports.dto'
import { AuditService } from '../audit/audit.service'
import { AuditAction } from '../audit/audit.actions'

const reportWithRelations = {
  adminAction: true,
  post: {
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      author: { select: { id: true, name: true } },
      course: { select: { code: true, department: { select: { name: true } } } },
    },
  },
  reporter: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ReportInclude

type ReportWithRelations = Prisma.ReportGetPayload<{ include: typeof reportWithRelations }>

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // Another university's post is a 404, the same as one that doesn't exist.
  async createReport(postId: string, userId: string, dto: CreateReportDto, scope: UniversityScope) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId, AND: [postInScope(scope)] },
      select: { id: true },
    })
    if (!post) throw new NotFoundException('Post not found')

    const existing = await this.prisma.report.findUnique({
      where: { postId_userId: { postId, userId } },
    })
    if (existing) throw new BadRequestException('You have already reported this post')

    const report = await this.prisma.report.create({
      data: { postId, userId, reason: dto.reason, comment: dto.comment, status: 'PENDING' },
    })

    await this.prisma.post.update({
      where: { id: postId },
      data: { publicationStatus: 'PENDING_REVIEW' },
    })

    this.logger.log(`[ReportsService] Report ${report.id} created for post ${postId}`)
    return report
  }

  async listReports(
    filters: ListReportsDto,
    scope: UniversityScope,
  ): Promise<{ reports: ReportWithRelations[]; total: number; page: number; limit: number }> {
    const limit = filters.limit || 20
    const page = filters.page || 1
    const skip = (page - 1) * limit

    // No `deletedAt` filter on the post: approving a report soft-deletes it, and the
    // moderator's history still lists that report.
    const where: Prisma.ReportWhereInput = {
      AND: [
        { post: postInScope(scope) },
        ...(filters.status ? [{ status: filters.status }] : []),
        ...(filters.reason ? [{ reason: filters.reason }] : []),
      ],
    }

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: reportWithRelations,
      }),
      this.prisma.report.count({ where }),
    ])

    return { reports, total, page, limit }
  }

  async approveReport(reportId: string, adminId: string, scope: UniversityScope, reason?: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId, AND: [{ post: postInScope(scope) }] },
      include: { post: true },
    })
    if (!report) throw new NotFoundException('Report not found')
    if (report.status !== 'PENDING')
      throw new BadRequestException('Only pending reports can be approved')

    const [updated] = await this.prisma.$transaction([
      this.prisma.report.update({ where: { id: reportId }, data: { status: 'APPROVED' } }),
      this.prisma.post.update({
        where: { id: report.postId },
        data: { publicationStatus: 'REJECTED', deletedAt: new Date() },
      }),
      this.prisma.adminAction.create({ data: { reportId, adminId, action: 'approve', reason } }),
    ])

    this.audit.record({
      action: AuditAction.ReportApprove,
      actorId: adminId,
      targetType: 'report',
      targetId: reportId,
      metadata: { postId: report.postId, reason: report.reason, note: reason ?? null },
    })
    this.logger.log(`[ReportsService] Report ${reportId} approved by admin ${adminId}`)
    return updated
  }

  async rejectReport(reportId: string, adminId: string, scope: UniversityScope, reason?: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId, AND: [{ post: postInScope(scope) }] },
      include: { post: true },
    })
    if (!report) throw new NotFoundException('Report not found')
    if (report.status !== 'PENDING')
      throw new BadRequestException('Only pending reports can be rejected')

    const [updated] = await this.prisma.$transaction([
      this.prisma.report.update({ where: { id: reportId }, data: { status: 'REJECTED' } }),
      this.prisma.post.update({
        where: { id: report.postId },
        data: { publicationStatus: 'PUBLISHED' },
      }),
      this.prisma.adminAction.create({ data: { reportId, adminId, action: 'reject', reason } }),
    ])

    this.audit.record({
      action: AuditAction.ReportReject,
      actorId: adminId,
      targetType: 'report',
      targetId: reportId,
      metadata: { postId: report.postId, reason: report.reason, note: reason ?? null },
    })
    this.logger.log(`[ReportsService] Report ${reportId} rejected by admin ${adminId}`)
    return updated
  }
}
