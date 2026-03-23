import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { Prisma } from '@/generated/prisma/client'
import { CreateReportDto } from './dto/create-report.dto'
import { ListReportsDto } from './dto/list-reports.dto'

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

  constructor(private readonly prisma: PrismaService) {}

  async createReport(postId: string, userId: string, dto: CreateReportDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } })
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
  ): Promise<{ reports: ReportWithRelations[]; total: number; page: number; limit: number }> {
    const limit = filters.limit || 20
    const page = filters.page || 1
    const skip = (page - 1) * limit

    const where: Prisma.ReportWhereInput = {}
    if (filters.status) where.status = filters.status
    if (filters.reason) where.reason = filters.reason

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

  async approveReport(reportId: string, adminId: string, reason?: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
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

    this.logger.log(`[ReportsService] Report ${reportId} approved by admin ${adminId}`)
    return updated
  }

  async rejectReport(reportId: string, adminId: string, reason?: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
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

    this.logger.log(`[ReportsService] Report ${reportId} rejected by admin ${adminId}`)
    return updated
  }
}
