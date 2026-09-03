import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'
import { PresentonAccountsService } from './presenton/presenton-accounts.service'
import { UserRole } from '@/generated/prisma/client'
import { AI_EDIT_DAILY_CAP, QUOTA_WINDOW_MS } from './decks.constants'

/**
 * Authorizes every request the embedded editor makes.
 *
 * Traefik calls this as a `forwardAuth` middleware in front of the generator's hostname: a
 * non-2xx blocks the request, and the `Cookie` header returned on a 2xx replaces the one the
 * browser sent, which is how the student's generator session is attached without the browser
 * ever holding it.
 *
 * Two consequences shape everything here.
 *
 * It is on the request path of every asset the editor loads, so it must stay cheap — Redis
 * only, no database work.
 *
 * And it is the ONLY thing standing between a student and the generator's whole API. The
 * editor's own buttons can generate decks and call the model directly, neither of which goes
 * anywhere near the queue, the 3-a-day allowance or DECK_CONCURRENCY. Without the lists below,
 * embedding the editor would quietly undo the spend controls the queue exists to enforce.
 */

/** Namespaced per user; TTL makes the window roll from first use rather than at midnight. */
const AI_EDIT_KEY_PREFIX = 'presenton-ai-edits:'

/**
 * Routes a student must not reach at all.
 *
 * Creation is blocked rather than metered because a deck made here would exist in the
 * generator with no Deck row in our database: invisible in the library, uncounted by the
 * allowance, never cleaned up when the student deletes anything. Creation belongs to Unishare.
 */
const BLOCKED: readonly string[] = [
  '/api/v1/admin',
  '/api/v1/ppt/presentation/generate',
  '/api/v1/ppt/presentation/create',
  '/api/v1/ppt/presentation/prepare',
  '/api/v1/ppt/presentation/derive',
  // Progress for a generation task. Blocked because the generator does not check ownership
  // on it at all -- it looks the task up by id and returns it -- so a leaked id would hand
  // one student another's progress and error text. Nothing in the browser needs this; the
  // worker polls it server-side.
  '/api/v1/ppt/presentation/status',
  '/api/v1/auth/token',
  '/api/v1/auth/setup',
  // The browser has no business authenticating: the session is injected upstream. Logout in
  // particular would invalidate the cookie server-side and break the frame until the cache
  // expires, from a button the student has no reason to press.
  '/api/v1/auth/login',
  '/api/v1/auth/logout',
]

/** Same reason as BLOCKED, but the id sits mid-path: `/presentation/{id}/duplicate`. */
const BLOCKED_SUFFIXES: readonly string[] = ['/duplicate']

/**
 * Routes that spend model tokens. Metered rather than blocked: AI editing is the reason to
 * embed this editor at all, and the generator's provider is a shared free tier — one student
 * looping a rewrite can exhaust the per-minute token budget and fail every deck queued behind
 * them.
 */
const METERED: readonly string[] = [
  '/api/v1/ppt/slide/edit',
  '/api/v1/ppt/slide/edit-html',
  '/api/v1/ppt/presentation/edit',
  '/api/v1/ppt/images/generate',
  // `/chat/message`, not `/chat`. The prefix charged an AI edit for GET /chat/conversations
  // and GET /chat/history, which only read rows the student already paid for.
  '/api/v1/ppt/chat/message',
  '/api/v1/ppt/theme/generate',
  '/api/v1/ppt/template/layouts/generate',
]

/**
 * Every API call the embedded editor is allowed to make, by method.
 *
 * An ALLOW-list, and the inversion is the entire point. The deny-list above names the routes
 * we knew were dangerous, which meant each generator upgrade could add a new one in silence --
 * and one already had. `GET /api/v1/ppt/outlines/stream/{id}` calls
 * `utils.llm_calls.generate_presentation_outlines` and streams model output; it was neither
 * blocked nor metered, so a student with devtools could spend tokens against the shared
 * per-minute budget without ever touching AI_EDIT_DAILY_CAP. `GET /presentation/stream/{id}`
 * sat in the same gap.
 *
 * `*` matches exactly ONE segment. That is what separates `/presentation/{id}` -- the deck
 * being edited, allowed -- from `/presentation/stream/{id}`, which is model output and is not.
 *
 * Methods matter because paths collide: the editor needs `GET /template/{id}`, while
 * `DELETE /template/{id}` removes a template that is INSTANCE-WIDE, so it would vandalise
 * every other student's deck options. Path alone cannot tell those apart.
 *
 * Built from the generator's observed traffic plus its editor's feature surface. Anything
 * missing fails closed, so the cost of an omission is one editor feature visibly not working
 * -- which someone reports -- rather than an unmetered model call nobody notices until the
 * provider bill.
 */
interface AllowRule {
  readonly methods: readonly string[]
  readonly pattern: string
}

const ALLOWED: readonly AllowRule[] = [
  // Session state. The editor polls /auth/status constantly -- it is the single most frequent
  // request the generator serves.
  { methods: ['GET'], pattern: '/api/v1/auth/status' },
  { methods: ['GET'], pattern: '/api/v1/auth/verify' },
  { methods: ['GET'], pattern: '/api/v1/auth/presenton/status' },
  // Admin-only upstream, so it 403s for a student account and the editor shows a toast about
  // provider settings. Allowed anyway: refusing it here would change nothing except which
  // component reports the same failure.
  { methods: ['GET'], pattern: '/api/user-config' },
  { methods: ['GET'], pattern: '/api/v1/async-tasks' },

  // The deck being edited. BLOCKED still governs generate/create/prepare/derive/status, so
  // the single-segment wildcard cannot reach a creation route.
  { methods: ['GET'], pattern: '/api/v1/ppt/presentation/all' },
  { methods: ['GET'], pattern: '/api/v1/ppt/presentation/*' },
  { methods: ['POST'], pattern: '/api/v1/ppt/presentation/*/export' },
  { methods: ['PATCH'], pattern: '/api/v1/ppt/presentation/slide_update' },
  { methods: ['PATCH'], pattern: '/api/v1/ppt/presentation/update' },
  { methods: ['POST'], pattern: '/api/v1/ppt/presentation/edit' },

  // Template and theme reads, one per template the editor renders. Writes are absent on
  // purpose: templates and themes are instance-wide.
  { methods: ['GET'], pattern: '/api/v1/ppt/template/all' },
  { methods: ['GET'], pattern: '/api/v1/ppt/template/*' },
  { methods: ['GET'], pattern: '/api/v1/ppt/template/*/theme' },
  { methods: ['POST'], pattern: '/api/v1/ppt/template/layouts/generate' },
  { methods: ['GET'], pattern: '/api/v1/ppt/themes/all' },
  { methods: ['GET'], pattern: '/api/v1/ppt/layouts' },
  { methods: ['GET'], pattern: '/api/v1/ppt/layouts/*' },
  { methods: ['POST'], pattern: '/api/v1/ppt/theme/generate' },

  // Slide editing, the reason the editor is embedded at all.
  { methods: ['POST'], pattern: '/api/v1/ppt/slide/edit' },
  { methods: ['POST'], pattern: '/api/v1/ppt/slide/edit-html' },

  // Pickers. `images/generate` is a GET upstream and is metered.
  { methods: ['GET'], pattern: '/api/v1/ppt/icons/search' },
  { methods: ['GET'], pattern: '/api/v1/ppt/images/search' },
  { methods: ['GET'], pattern: '/api/v1/ppt/images/generate' },
  { methods: ['GET'], pattern: '/api/v1/ppt/images/generated' },
  { methods: ['GET'], pattern: '/api/v1/ppt/images/uploaded' },
  { methods: ['POST'], pattern: '/api/v1/ppt/images/upload' },
  { methods: ['GET'], pattern: '/api/v1/ppt/fonts/list' },
  { methods: ['GET'], pattern: '/api/v1/ppt/fonts/uploaded' },

  // Chat: reading history is free, sending a message is metered.
  { methods: ['GET'], pattern: '/api/v1/ppt/chat/conversations' },
  { methods: ['GET'], pattern: '/api/v1/ppt/chat/history' },
  { methods: ['POST'], pattern: '/api/v1/ppt/chat/message' },
  { methods: ['POST'], pattern: '/api/v1/ppt/chat/message/stream' },

  // Community browse. In the observed traffic, so the editor's own nav reaches it.
  { methods: ['GET'], pattern: '/api/v1/ppt/community/presentations' },
  { methods: ['GET'], pattern: '/api/v1/ppt/community/presentations/*' },

  { methods: ['POST'], pattern: '/api/v1/ppt/generation/defaults' },
]

@Injectable()
export class DecksFrameAuthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DecksFrameAuthService.name)
  private redis!: Redis

  constructor(
    private readonly config: ConfigService,
    private readonly accounts: PresentonAccountsService,
  ) {}

  onModuleInit() {
    this.redis = new Redis(this.config.get<string>('REDIS_URL', 'redis://localhost:6379'))
    this.redis.on('error', (err: Error) => this.logger.error('Frame auth redis error', err))
  }

  onModuleDestroy() {
    this.redis?.disconnect()
  }

  /**
   * Returns the `Cookie` header value to forward upstream, or throws the status Traefik should
   * turn into a refusal.
   */
  async authorize(
    userId: string,
    requestUri: string,
    role?: UserRole,
    method?: string,
  ): Promise<string> {
    const path = pathOf(requestUri)

    if (isBlocked(path)) {
      this.logger.warn(`Blocked editor request to ${path} by ${userId}`)
      throw new ForbiddenException('That part of the deck editor is not available')
    }

    if (isApiPath(path)) {
      // Traefik's forwardAuth always sends X-Forwarded-Method. Its absence means the caller is
      // not the proxy, and guessing a method for an allow-list decision would be the hole this
      // whole change exists to close -- so refuse and say so loudly.
      if (!method) {
        this.logger.error(`No X-Forwarded-Method for ${path}; refusing`)
        throw new ForbiddenException('That part of the deck editor is not available')
      }

      if (!isAllowed(path, method.toUpperCase())) {
        this.logger.warn(`Editor request outside the allow-list: ${method} ${path} by ${userId}`)
        throw new ForbiddenException('That part of the deck editor is not available')
      }
    }

    // Administrators are metered but not capped. The BLOCKED list still applies to them: it
    // keeps deck creation inside Unishare so every deck has a row, which is a correctness
    // rule about the library and the cleanup job rather than a spending limit.
    if (isMetered(path) && role !== UserRole.ADMIN) {
      await this.chargeAiEdit(userId, path)
    }

    return this.accounts.sessionFor(userId)
  }

  /**
   * Counts one AI edit against the student's daily allowance.
   *
   * Fails CLOSED, unlike the cron lock's fail-open: if the counter is unreadable there is no
   * way to know whether the cap is already spent, and an unmetered model endpoint is a worse
   * outcome than a temporarily unavailable AI button. Only the metered routes are affected —
   * the rest of the editor keeps working without Redis.
   */
  private async chargeAiEdit(userId: string, path: string): Promise<void> {
    const key = `${AI_EDIT_KEY_PREFIX}${userId}`
    let used: number
    try {
      used = await this.redis.incr(key)
      // Set the expiry only when this call created the key, so the window measures from the
      // first edit rather than sliding forward with every one.
      if (used === 1) await this.redis.pexpire(key, QUOTA_WINDOW_MS)
    } catch (err) {
      this.logger.error(`AI edit metering unavailable, refusing ${path}: ${String(err)}`)
      throw new HttpException(
        'AI editing is briefly unavailable. Your slides and downloads are unaffected.',
        HttpStatus.SERVICE_UNAVAILABLE,
      )
    }

    if (used > AI_EDIT_DAILY_CAP) {
      this.logger.log(`AI edit cap reached by ${userId} (${used - 1}/${AI_EDIT_DAILY_CAP})`)
      throw new HttpException(
        `You have used all ${AI_EDIT_DAILY_CAP} AI edits for today. ` +
          'You can still edit slides yourself.',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }
  }
}

/** Traefik sends the original path in X-Forwarded-Uri, query string included. */
export function pathOf(requestUri: string): string {
  const withoutQuery = requestUri.split('?')[0] ?? ''

  // Resolve `..` segments. Anything unparseable is treated as the raw string rather than
  // trusted, since a path we cannot understand should still be matched against the lists.
  let path = withoutQuery
  try {
    path = new URL(withoutQuery, 'http://x').pathname
  } catch {
    // Keep the raw value.
  }

  // URL does NOT collapse repeated slashes, but nginx in front of the generator does: without
  // this, `/api/v1//admin/users` fails the prefix check here and is then served as
  // `/api/v1/admin/users` upstream. Normalising to the stricter of the two readings is the
  // only safe direction.
  return path.replace(/\/{2,}/g, '/')
}

export function isBlocked(path: string): boolean {
  return (
    BLOCKED.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)) ||
    BLOCKED_SUFFIXES.some((suffix) => path.endsWith(suffix))
  )
}

export function isMetered(path: string): boolean {
  return METERED.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

/**
 * Whether a path is an API call at all.
 *
 * Everything else -- the editor's own pages, its Next.js chunks, the fonts and template assets
 * under /app_data -- is served to a student who has already been authorized to open the
 * editor. Enumerating Next's internal routes would break on every generator upgrade for no
 * security gain, since none of them spend tokens or mutate shared state.
 */
export function isApiPath(path: string): boolean {
  return path === '/api' || path.startsWith('/api/')
}

/** `*` matches exactly one segment, so a pattern never spans a `/`. */
function matchesPattern(pattern: string, path: string): boolean {
  const want = pattern.split('/')
  const got = path.split('/')
  if (want.length !== got.length) return false
  return want.every((segment, i) => segment === '*' || segment === got[i])
}

export function isAllowed(path: string, method: string): boolean {
  return ALLOWED.some((rule) => rule.methods.includes(method) && matchesPattern(rule.pattern, path))
}
