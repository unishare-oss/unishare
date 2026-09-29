import { createAuthMiddleware, getSessionFromCtx, isAPIError } from 'better-auth/api'
import type { Prisma } from '../generated/prisma/client'
import { AuditAction, type AuditActionValue } from '../modules/audit/audit.actions'
import { writeAuditLog, type AuditEntry, type AuditLogClient } from '../modules/audit/audit-writer'

/**
 * Better Auth's admin plugin performs role changes, bans and removals from the browser, so
 * they never pass through a Nest service. These hooks are the only place they can be seen.
 */
const ADMIN_ACTIONS: Record<string, AuditActionValue> = {
  '/admin/set-role': AuditAction.UserSetRole,
  '/admin/ban-user': AuditAction.UserBan,
  '/admin/unban-user': AuditAction.UserUnban,
  '/admin/remove-user': AuditAction.UserDelete,
}

interface TargetSnapshot {
  name: string | null
  role: string | null
}

type Client = AuditLogClient & {
  user: {
    findUnique: (args: {
      where: { id: string }
      select: { name: true; role: true }
    }) => Promise<TargetSnapshot | null>
  }
}

interface AdminBody {
  userId?: string
  role?: string
  banReason?: string
  banExpiresIn?: number
}

/**
 * The target as it was before the action: after it, a role change shows only the new role and
 * a removed user is gone. Keyed by the request, which Better Auth passes unchanged from the
 * before hook to the after hook.
 */
const snapshots = new WeakMap<Request, TargetSnapshot | null>()

/** Never lets an audit failure surface in the request that triggered it. */
export function recordSafely(client: AuditLogClient, entry: AuditEntry) {
  void writeAuditLog(client, entry).catch((err: unknown) =>
    console.error(`[audit] failed to record ${entry.action}:`, err),
  )
}

export function clientIp(headers: Headers | undefined): string | null {
  return headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || null
}

function lookupTarget(client: Client, userId: string | undefined) {
  if (!userId) return Promise.resolve(null)
  return client.user
    .findUnique({ where: { id: userId }, select: { name: true, role: true } })
    .catch(() => null)
}

export function createAuditHooks(client: Client) {
  return {
    before: createAuthMiddleware(async (ctx) => {
      if (!ADMIN_ACTIONS[ctx.path] || !ctx.request) return
      snapshots.set(ctx.request, await lookupTarget(client, (ctx.body as AdminBody)?.userId))
    }),

    after: createAuthMiddleware(async (ctx) => {
      const action = ADMIN_ACTIONS[ctx.path]
      if (!action || isAPIError(ctx.context.returned)) return

      const session = await getSessionFromCtx(ctx).catch(() => null)
      if (!session) return

      const body = (ctx.body ?? {}) as AdminBody
      const target =
        ctx.request && snapshots.has(ctx.request)
          ? snapshots.get(ctx.request)
          : await lookupTarget(client, body.userId)

      const metadata: Record<string, Prisma.InputJsonValue | null> = {
        targetName: target?.name ?? null,
      }
      if (action === AuditAction.UserSetRole) {
        metadata.from = target?.role ?? null
        metadata.to = body.role ?? null
      }
      if (action === AuditAction.UserBan) {
        metadata.banReason = body.banReason ?? null
        metadata.banExpiresIn = body.banExpiresIn ?? null
      }

      recordSafely(client, {
        action,
        actorId: session.user.id,
        actorName: session.user.name,
        actorRole: (session.user as { role?: string }).role ?? null,
        targetType: 'user',
        targetId: body.userId ?? null,
        metadata: metadata as Prisma.InputJsonObject,
        ip: clientIp(ctx.request?.headers),
        userAgent: ctx.request?.headers.get('user-agent') ?? null,
      })
    }),
  }
}
