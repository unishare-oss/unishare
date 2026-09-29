import type { Prisma } from '@/generated/prisma/client'
import type { AuditActionValue } from './audit.actions'

export interface AuditEntry {
  action: AuditActionValue
  actorId?: string | null
  actorName?: string | null
  actorRole?: string | null
  targetType?: string | null
  targetId?: string | null
  metadata?: Prisma.InputJsonValue
  ip?: string | null
  userAgent?: string | null
}

/** The slice of a Prisma client the writer needs, so Better Auth's own client can use it too. */
export interface AuditLogClient {
  auditLog: { create: (args: { data: Prisma.AuditLogUncheckedCreateInput }) => Promise<unknown> }
}

/** Longest user agent we keep; the header is client-controlled. */
const MAX_USER_AGENT = 300

export async function writeAuditLog(client: AuditLogClient, entry: AuditEntry): Promise<void> {
  await client.auditLog.create({
    data: {
      action: entry.action,
      actorId: entry.actorId ?? null,
      actorName: entry.actorName ?? null,
      actorRole: entry.actorRole ?? null,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      metadata: entry.metadata,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent?.slice(0, MAX_USER_AGENT) ?? null,
    },
  })
}
