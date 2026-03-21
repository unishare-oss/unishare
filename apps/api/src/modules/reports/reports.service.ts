import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateReportDto } from './dto/create-report.dto'
import { ListReportsDto } from './dto/list-reports.dto'
import { Report } from '@/generated/prisma/client'

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submit a report for a post.
   * Only one report per user per post.
   * Soft-deletes post to status PENDING_REVIEW.
   */
  async createReport(postId: string, userId: string, dto: CreateReportDto): Promise<Report> {
    // Verify post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    })
    if (!post) {
      throw new NotFoundException('Post not found')
    }

    // Check for duplicate report
    const existing = await this.prisma.report.findUnique({
      where: {
        postId_userId: { postId, userId },
      },
    })
    if (existing) {
      throw new BadRequestException('You have already reported this post')
    }

    // Create report
    const report = await this.prisma.report.create({
      data: {
        postId,
        userId,
        reason: dto.reason,
        comment: dto.comment,
        status: 'PENDING',
      },
    })

    // Soft-delete: mark post as PENDING_REVIEW
    await this.prisma.post.update({
      where: { id: postId },
      data: { publicationStatus: 'PENDING_REVIEW' },
    })

    this.logger.log(`[ReportsService] Report ${report.id} created for post ${postId}`)

    return report
  }

  /**
   * List reports with optional filters.
   * Admin-only access should be verified in controller.
   */
  async listReports(filters: ListReportsDto): Promise<{
    reports: Report[]
    total: number
    page: number
    limit: number
  }> {
    const limit = filters.limit || 20
    const page = filters.page || 1
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    if (filters.status) where.status = filters.status
    if (filters.reason) where.reason = filters.reason

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          adminAction: true,
          post: { select: { id: true, title: true, description: true } },
          reporter: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ])

    return { reports, total, page, limit }
  }

  /**
   * Approve a report: mark post as REJECTED.
   * Update report status to APPROVED.
   * Create AdminAction audit entry.
   */
  async approveReport(reportId: string, adminId: string, reason?: string): Promise<Report> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { post: true },
    })

    if (!report) {
      throw new NotFoundException('Report not found')
    }

    if (report.status !== 'PENDING') {
      throw new BadRequestException('Only pending reports can be approved')
    }

    // Update report and post in transaction
    const updated = await this.prisma.$transaction([
      this.prisma.report.update({
        where: { id: reportId },
        data: { status: 'APPROVED' },
      }),
      this.prisma.post.update({
        where: { id: report.postId },
        data: { publicationStatus: 'REJECTED' }, // Post is rejected/deleted
      }),
      this.prisma.adminAction.create({
        data: {
          reportId,
          adminId,
          action: 'approve',
          reason,
        },
      }),
    ])

    this.logger.log(`[ReportsService] Report ${reportId} approved by admin ${adminId}`)

    return updated[0] // Return updated report
  }

  /**
   * Reject a report: restore post to PUBLISHED.
   * Update report status to REJECTED.
   * Create AdminAction audit entry.
   */
  async rejectReport(reportId: string, adminId: string, reason?: string): Promise<Report> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { post: true },
    })

    if (!report) {
      throw new NotFoundException('Report not found')
    }

    if (report.status !== 'PENDING') {
      throw new BadRequestException('Only pending reports can be rejected')
    }

    // Update report and post in transaction
    const updated = await this.prisma.$transaction([
      this.prisma.report.update({
        where: { id: reportId },
        data: { status: 'REJECTED' },
      }),
      this.prisma.post.update({
        where: { id: report.postId },
        data: { publicationStatus: 'PUBLISHED' }, // Post restored
      }),
      this.prisma.adminAction.create({
        data: {
          reportId,
          adminId,
          action: 'reject',
          reason,
        },
      }),
    ])

    this.logger.log(`[ReportsService] Report ${reportId} rejected by admin ${adminId}`)

    return updated[0] // Return updated report
  }
}
