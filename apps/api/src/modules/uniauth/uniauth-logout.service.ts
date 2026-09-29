import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { resolveLocalUserId } from '../mcp/mcp-token.verifier'
import { LOGOUT_EVENT, verifyUniauthEventData } from './uniauth-event-token'

/**
 * Ends unishare sessions when the person signs out of uniauth. The logout token names the
 * uniauth session (`sid`) that ended: only unishare sessions from it end, so signing out one
 * device leaves the others signed in. Sessions from before sids were recorded (no
 * uniauthSid) end too, as they can't be matched. No sid in the token: all of the user's.
 */
@Injectable()
export class UniauthLogoutService {
  private readonly logger = new Logger(UniauthLogoutService.name)

  constructor(private readonly prisma: PrismaService) {}

  /** Returns false for an invalid token (the caller answers 400, per the spec). */
  async handle(logoutToken: string): Promise<boolean> {
    const event = await verifyUniauthEventData(logoutToken, LOGOUT_EVENT)
    if (!event) return false

    const userId = await resolveLocalUserId(this.prisma, event.sub)
    if (!userId) return true // never signed in to unishare: nothing to end
    const { count } = await this.prisma.session.deleteMany({
      where: event.sid
        ? { userId, OR: [{ uniauthSid: event.sid }, { uniauthSid: null }] }
        : { userId },
    })
    this.logger.log(`Back-channel logout ended ${count} session(s) for ${userId}`)
    return true
  }
}
