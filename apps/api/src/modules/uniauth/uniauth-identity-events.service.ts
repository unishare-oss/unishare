import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ORGANIZATIONS_CLAIM, universityForMemberships } from '@/auth/uniauth-sign-in'
import type { Prisma, PrismaClient } from '@/generated/prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { resolveLocalUserId } from '../mcp/mcp-token.verifier'
import { UniauthDirectoryClient, type DirectoryIdentity } from './uniauth-directory.client'
import { verifyIdentityEvent, type IdentityEvent } from './uniauth-identity-event-token'
import { UniauthUserDeletedService } from './uniauth-user-deleted.service'

export type EventOutcome = 'applied' | 'duplicate' | 'stale' | 'ignored'

/**
 * The directory's answer is older than the event that asked for it (a lagging read): applying it would record a version
 * the event has already passed. The receiver answers 503 so uniauth retries; reconciliation stops before that page.
 */
export class NotYetConsistent extends Error {}

/** What an accepted event does to the local user. */
type Change =
  | { kind: 'profile'; profile: DirectoryIdentity; skipEmail?: boolean }
  | { kind: 'suspend' }
  | { kind: 'reactivate' }

/** How the controller answers: 204 acknowledged, 401 retry (unverified), 400 final. (503 is thrown.) */
export type HandleResult = 204 | 400 | 401

const isUniqueViolation = (error: unknown) => (error as { code?: string } | null)?.code === 'P2002'

/**
 * Applies uniauth's v1 identity events (docs/uniauth/integration.md). The event has no profile: an update is fetched
 * from the directory first (a 503 is thrown if uniauth cannot answer, so uniauth retries instead of the event being
 * acknowledged unapplied). The event id is stored with the change in one transaction, so a redelivery changes nothing,
 * the user row is locked meanwhile (an older change can never overwrite a newer one), and a change applies only if its
 * identity version is higher than the one the user holds.
 *
 * - identity.updated: refresh name, email, avatar, verification AND university (from the directory's memberships, with
 *   the same rule as sign-in: a university only changes when a membership maps). The version stored is the directory's if
 *   it is newer than the event's; if it is OLDER the read is not yet consistent (NotYetConsistent, answered 503).
 * - identity.suspended: ends the person's sessions at once; new sessions are refused while suspended. This is uniauth's
 *   account state: it never touches Unishare's own ban (`banned`), roles or content.
 * - identity.reactivated: allowed again (old sessions are not restored).
 * - identity.deleted (or an update that reads as a tombstone): exactly the existing deletion (UniauthUserDeletedService).
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
    if (result.kind === 'event') {
      try {
        await this.apply(result.event)
      } catch (error) {
        if (error instanceof NotYetConsistent) {
          throw new ServiceUnavailableException('the directory is not yet consistent; retry')
        }
        throw error
      }
    }
    return 204
  }

  /** `known` lets reconciliation pass what it already looked up (the profile, the local user id). */
  async apply(
    event: IdentityEvent,
    known: { profile?: DirectoryIdentity | null; userId?: string } = {},
  ): Promise<EventOutcome> {
    const userId = known.userId ?? (await resolveLocalUserId(this.prisma, event.subject))
    if (!userId) return 'ignored'
    if (event.type === 'identity.deleted') return this.applyDeletion(event)

    let change: Change
    let version = event.identityVersion
    if (event.type === 'identity.suspended') change = { kind: 'suspend' }
    else if (event.type === 'identity.reactivated') change = { kind: 'reactivate' }
    else if (event.type === 'identity.updated') {
      const current =
        known.profile === undefined ? await this.directory.read(event.subject) : known.profile
      if (!current) return 'ignored'
      if (current.status === 'deleted') return this.applyDeletion(event)
      if (current.version < event.identityVersion) throw new NotYetConsistent()
      version = current.version
      change = { kind: 'profile', profile: current }
    } else return 'ignored'

    try {
      return await this.record(event, userId, version, change)
    } catch (error) {
      // The new email was taken by another user between the check and the write: keep the old one, apply the rest.
      if (change.kind !== 'profile' || !isUniqueViolation(error)) throw error
      return this.record(event, userId, version, { ...change, skipEmail: true })
    }
  }

  private record(
    event: IdentityEvent,
    userId: string,
    version: number,
    change: Change,
  ): Promise<EventOutcome> {
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
      const user = await this.lockedUser(tx, userId)
      if (!user) return 'ignored'
      if (user.identityVersion !== null && version <= user.identityVersion) return 'stale'
      await this.write(tx, userId, user.email, version, change)
      return 'applied'
    })
  }

  /** The user row, locked until the transaction ends: two changes for one person run one after the other. */
  private async lockedUser(tx: Prisma.TransactionClient, userId: string) {
    await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${userId} FOR UPDATE`
    return tx.user.findUnique({
      where: { id: userId },
      select: { identityVersion: true, email: true },
    })
  }

  private async write(
    tx: Prisma.TransactionClient,
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
        change.skipEmail ||
        (!!email && email !== currentEmail && (await tx.user.count({ where: { email } })) > 0)
      if (taken)
        this.logger.warn(`Kept the old email of ${userId}: ${email} belongs to another user`)
      const memberships = profile[ORGANIZATIONS_CLAIM]
      const universityId = Array.isArray(memberships)
        ? await universityForMemberships(tx as unknown as PrismaClient, memberships)
        : null
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(profile.name && { name: profile.name }),
          ...(email && !taken && { email, emailVerified: profile.emailVerified === true }),
          image: profile.image || null,
          ...(universityId && { universityId }),
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
   * is not an event. A tombstone (or a deleted status) is the existing deletion.
   */
  async applyResync(
    userId: string,
    state: DirectoryIdentity | 'deleted',
    subject: string,
  ): Promise<'applied' | 'stale' | 'gone'> {
    if (state === 'deleted' || state.status === 'deleted') {
      await this.deleted.deleteLocalUser(subject)
      return 'applied'
    }
    return this.prisma.$transaction(async (tx) => {
      const user = await this.lockedUser(tx, userId)
      if (!user) return 'gone'
      if (user.identityVersion !== null && state.version <= user.identityVersion) return 'stale'
      await this.write(tx, userId, user.email, state.version, { kind: 'profile', profile: state })
      return 'applied'
    })
  }
}
