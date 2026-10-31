import { Injectable, Logger } from '@nestjs/common'
import {
  ORGANIZATIONS_CLAIM,
  type UniauthMembership,
  universityForMemberships,
} from '@/auth/uniauth-sign-in'
import { PrismaService } from '@/prisma/prisma.service'
import { resolveLocalUserId } from '../mcp/mcp-token.verifier'
import { USER_UPDATED_EVENT, verifyUniauthEventData } from './uniauth-event-token'

/**
 * Refreshes unishare's copy of a person's uniauth profile (name, avatar, email, university)
 * when it changes there, instead of at their next sign-in. Same fields and rules as the
 * sign-in mapping (uniauth-sign-in.ts): a university only changes when a membership maps.
 */
@Injectable()
export class UniauthUserUpdatedService {
  private readonly logger = new Logger(UniauthUserUpdatedService.name)

  constructor(private readonly prisma: PrismaService) {}

  /** Returns false for an invalid token (the caller answers 400). */
  async handle(token: string): Promise<boolean> {
    const verified = await verifyUniauthEventData(token, USER_UPDATED_EVENT)
    if (!verified) return false
    const { sub, data } = verified

    const userId = await resolveLocalUserId(this.prisma, sub)
    if (!userId) return true // never used unishare: nothing to refresh

    const memberships = Array.isArray(data[ORGANIZATIONS_CLAIM])
      ? (data[ORGANIZATIONS_CLAIM] as UniauthMembership[])
      : []
    const universityId = await universityForMemberships(this.prisma, memberships)
    const profile = {
      ...(typeof data.name === 'string' && data.name && { name: data.name }),
      ...((typeof data.picture === 'string' || data.picture === null) && {
        image: data.picture || null,
      }),
      ...(typeof data.email_verified === 'boolean' && { emailVerified: data.email_verified }),
      ...(universityId && { universityId }),
    }
    const email = typeof data.email === 'string' && data.email ? data.email.toLowerCase() : null

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { ...profile, ...(email && { email }) },
      })
    } catch (error) {
      // The new email already belongs to another unishare user: refresh everything else.
      if (!email || (error as { code?: string }).code !== 'P2002') throw error
      await this.prisma.user.update({ where: { id: userId }, data: profile })
      this.logger.warn(`Kept the old email of ${userId}: ${email} belongs to another user`)
    }
    this.logger.log(`Refreshed ${userId} from uniauth (account ${sub})`)
    return true
  }
}
