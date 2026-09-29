import { Injectable, Logger } from '@nestjs/common'
import { auth } from '@/auth/auth.config'
import { PrismaService } from '@/prisma/prisma.service'
import { resolveLocalUserId } from '../mcp/mcp-token.verifier'
import { AuditService } from '../audit/audit.service'
import { AuditAction } from '../audit/audit.actions'
import { USER_DELETED_EVENT, verifyUniauthEvent } from './uniauth-event-token'

/**
 * Deletes a person's unishare data when their uniauth account is deleted (from uniauth's
 * account page or any other app). Same deletion as "Delete my Unishare data" on the profile
 * page: sessions, accounts, then the user, whose content goes with it (schema cascades).
 */
@Injectable()
export class UniauthUserDeletedService {
  private readonly logger = new Logger(UniauthUserDeletedService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Returns false for an invalid token (the caller answers 400). */
  async handle(token: string): Promise<boolean> {
    const uniauthUserId = await verifyUniauthEvent(token, USER_DELETED_EVENT)
    if (!uniauthUserId) return false

    const userId = await resolveLocalUserId(this.prisma, uniauthUserId)
    if (!userId) return true // never used unishare: nothing to delete
    // Name and role are looked up now: the row is gone once the user is deleted.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, role: true },
    })
    const { internalAdapter } = await auth.$context
    await internalAdapter.deleteUserSessions(userId)
    await internalAdapter.deleteAccounts(userId)
    await internalAdapter.deleteUser(userId)
    this.audit.record({
      action: AuditAction.UserDeleteViaUniauth,
      actorId: userId,
      actorName: user?.name,
      actorRole: user?.role,
      targetType: 'user',
      targetId: userId,
      metadata: { uniauthUserId },
    })
    this.logger.log(`Deleted user ${userId} (uniauth account ${uniauthUserId} was deleted)`)
    return true
  }
}
