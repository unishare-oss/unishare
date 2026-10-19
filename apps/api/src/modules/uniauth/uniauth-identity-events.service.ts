import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { resolveLocalUserId } from '../mcp/mcp-token.verifier'
import { UniauthDirectoryClient, type DirectoryIdentity } from './uniauth-directory.client'
import { verifyIdentityEvent, type IdentityEvent } from './uniauth-identity-event-token'
import { UniauthUserDeletedService } from './uniauth-user-deleted.service'

export type EventOutcome = 'applied' | 'duplicate' | 'stale' | 'ignored'

/** What an accepted event does to the local user. */
type Change =
  { kind: 'profile'; profile: DirectoryIdentity } | { kind: 'suspend' } | { kind: 'reactivate' }

/** How the controller answers: 204 acknowledged, 401 retry (unverified), 400 final, 503 retry (could not finish). */
export type HandleResult = 204 | 400 | 401

/**
 * Applies uniauth's v1 identity events (docs/uniauth/integration.md). The event has no profile: an update is fetched
 * from the directory first (a 503 is thrown if uniauth cannot answer, so uniauth retries instead of the event being
 * acknowledged unapplied). The event id is stored with the change in one transaction, so a redelivery changes nothing,
 * and a change applies only if its identity version is higher than the one the user holds.
 *
 * - identity.updated: refresh name, email, avatar and verification from the directory. (University memberships are not
 *   in the directory; they still arrive with the legacy user-updated notice and at sign-in.)
 * - identity.suspended: ends the person's sessions at once; new sessions are refused while suspended. This is uniauth's
 *   account state: it never touches Unishare's own ban (`banned`), roles or content.
 * - identity.reactivated: allowed again (old sessions are not restored).
 * - identity.deleted: exactly the existing deletion (UniauthUserDeletedService), whose result is not changed here.
 * Guests have no uniauth account, so no event can reach them. Unknown people and unknown event types are acknowledged
 * and ignored: an event never creates a user.
 */
@Injectable()
export class UniauthIdentityEventsService {
  private readonly logger = new Logger(UniauthIdentityEventsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: UniauthDirectoryClient,
    private readonly deleted: UniauthUserDeletedService,
  ) {}

  async handle(token: string): Promise<HandleResult> {
    const result = await verifyIdentityEvent(token)
    if (result.kind === 'unverified') return 401
    if (result.kind === 'malformed') return 400
    if (result.kind === 'event') await this.apply(result.event)
    return 204
  }

  async apply(event: IdentityEvent, profile?: DirectoryIdentity | null): Promise<EventOutcome> {
    const userId = await resolveLocalUserId(this.prisma, event.subject)
    if (!userId) return 'ignored'
    if (event.type === 'identity.deleted') return this.applyDeletion(event)

    let change: Change
    if (event.type === 'identity.suspended') change = { kind: 'suspend' }
    else if (event.type === 'identity.reactivated') change = { kind: 'reactivate' }
    else if (event.type === 'identity.updated') {
      const current = profile === undefined ? await this.directory.read(event.subject) : profile
      if (!current) return 'ignored'
      if (current.status === 'deleted') return this.applyDeletion(event)
      change = { kind: 'profile', profile: current }
    } else return 'ignored'

    return this.prisma.$transaction(async (tx) => {
      // createMany + skipDuplicates: a conflict is not an error, so the transaction stays usable.
      const { count } = await tx.identityEventReceipt.createMany({
        data: [
          {
            eventId: event.eventId,
            subject: event.subject,
            version: event.identityVersion,
            type: event.type,
          },
        ],
        skipDuplicates: true,
      })
      if (count === 0) return 'duplicate'
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { identityVersion: true, email: true },
      })
      if (!user) return 'ignored'
      if (user.identityVersion !== null && event.identityVersion <= user.identityVersion)
        return 'stale'
      await this.write(tx, userId, user.email, event.identityVersion, change)
      return 'applied'
    })
  }

  private async write(
    tx: Pick<PrismaService, 'user' | 'session'>,
    userId: string,
    currentEmail: string,
    version: number,
    change: Change,
  ) {
    if (change.kind === 'profile') {
      const { profile } = change
      const email = profile.email?.toLowerCase()
      // An email another unishare user holds is for a person to reconcile; the rest of the profile still applies.
      const taken =
        !!email && email !== currentEmail && (await tx.user.count({ where: { email } })) > 0
      if (taken)
        this.logger.warn(`Kept the old email of ${userId}: ${email} belongs to another user`)
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(profile.name && { name: profile.name }),
          ...(email && !taken && { email, emailVerified: profile.emailVerified === true }),
          image: profile.image || null,
          identityVersion: version,
          identityStatus: profile.status === 'suspended' ? 'suspended' : 'active',
        },
      })
      if (profile.status === 'suspended') await tx.session.deleteMany({ where: { userId } })
      return
    }
    await tx.user.update({
      where: { id: userId },
      data: {
        identityVersion: version,
        identityStatus: change.kind === 'suspend' ? 'suspended' : 'active',
      },
    })
    if (change.kind === 'suspend') await tx.session.deleteMany({ where: { userId } })
  }

  /** Deletion goes through the existing service (Better Auth's adapter, audit record), then the receipt is kept. */
  private async applyDeletion(event: IdentityEvent): Promise<EventOutcome> {
    const seen = await this.prisma.identityEventReceipt.findUnique({
      where: { eventId: event.eventId },
    })
    if (seen) return 'duplicate'
    await this.deleted.deleteLocalUser(event.subject)
    await this.prisma.identityEventReceipt.createMany({
      data: [
        {
          eventId: event.eventId,
          subject: event.subject,
          version: event.identityVersion,
          type: event.type,
        },
      ],
      skipDuplicates: true,
    })
    return 'applied'
  }

  /**
   * Brings one user to the directory's current state (a resync), only if newer than what they hold. No receipt: a resync
   * is not an event.
   */
  async applyResync(
    userId: string,
    state: DirectoryIdentity | 'deleted',
    subject: string,
  ): Promise<'applied' | 'stale' | 'gone'> {
    if (state === 'deleted') {
      await this.deleted.deleteLocalUser(subject)
      return 'applied'
    }
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { identityVersion: true, email: true },
      })
      if (!user) return 'gone'
      if (user.identityVersion !== null && state.version <= user.identityVersion) return 'stale'
      await this.write(tx, userId, user.email, state.version, { kind: 'profile', profile: state })
      return 'applied'
    })
  }
}
