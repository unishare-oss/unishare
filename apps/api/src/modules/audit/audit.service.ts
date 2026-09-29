import { Injectable, Logger } from '@nestjs/common'
import { Prisma } from '@/generated/prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { AuditEntry, writeAuditLog } from './audit-writer'
import { AUDIT_RETENTION_DAYS } from './audit.actions'
import { ListAuditLogsDto } from './dto/list-audit-logs.dto'

const DAY_MS = 24 * 60 * 60 * 1000

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fire-and-forget: an audit write must never fail or slow the action it describes, so callers
   * do not await this and a failure is only logged.
   */
  record(entry: AuditEntry): void {
    void this.write(entry).catch((err: unknown) =>
      this.logger.error(`Failed to record audit entry ${entry.action}: ${String(err)}`),
    )
  }

  private async write(entry: AuditEntry) {
    // Snapshot the actor's name so the row stays readable after the account is deleted.
    let { actorName, actorRole } = entry
    if (entry.actorId && (!actorName || !actorRole)) {
      const actor = await this.prisma.user.findUnique({
        where: { id: entry.actorId },
        select: { name: true, role: true },
      })
      actorName = actorName ?? actor?.name
      actorRole = actorRole ?? actor?.role
    }
    await writeAuditLog(this.prisma, { ...entry, actorName, actorRole })
  }

  async list(filters: ListAuditLogsDto) {
    const limit = filters.limit || 50
    const page = filters.page || 1

    const where: Prisma.AuditLogWhereInput = {}
    if (filters.action) where.action = filters.action
    else if (filters.category) where.action = { startsWith: `${filters.category}.` }
    if (filters.actorId) where.actorId = filters.actorId
    if (filters.targetType) where.targetType = filters.targetType
    if (filters.targetId) where.targetId = filters.targetId
    if (filters.from || filters.to) {
      where.createdAt = {
        ...(filters.from && { gte: new Date(filters.from) }),
        ...(filters.to && { lte: new Date(filters.to) }),
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ])

    return { logs, total, page, limit }
  }

  async pruneOld(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - AUDIT_RETENTION_DAYS * DAY_MS)
    const { count } = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    })
    return count
  }
}
