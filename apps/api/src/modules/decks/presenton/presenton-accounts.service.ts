import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac } from 'node:crypto'
import Redis from 'ioredis'

/**
 * Brokers a Presenton account per Unishare user.
 *
 * The generator is multi-tenant: a non-admin user's `presentation/all` returns only their own
 * decks and any other id 404s, enforced server-side. That is what makes embedding its editor
 * safe, and it only works if each student's decks are actually OWNED by a distinct account —
 * generating with one shared admin key would put every deck in one pile and show every student
 * everyone else's work.
 *
 * Nothing is stored. Passwords are derived from the user id with an HMAC, so there is no
 * credential table, no encryption key, and no per-user secret at rest. The cost of that trade
 * is that rotating PRESENTON_ACCOUNT_SECRET orphans every existing account — see the recovery
 * note in the k8s presenton/README.
 */

/** Session cookie name set by the generator's own login. */
const SESSION_COOKIE = 'presenton_session'

/**
 * Cached well below the server's own session lifetime. A stale cookie is not a correctness
 * problem — every caller retries once on 401 and re-logs in — but it does cost a wasted
 * round trip, and this cache sits on the request path of every asset the embedded editor loads.
 */
const SESSION_TTL_SECONDS = 30 * 60
const KEY_PREFIX = 'presenton-session:'
const ADMIN_KEY = `${KEY_PREFIX}__admin__`

/** Presenton requires >= 3 chars, no whitespace; ids are cuids so the prefix keeps it legible. */
export function presentonUsername(userId: string): string {
  return `u_${userId}`
}

@Injectable()
export class PresentonAccountsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PresentonAccountsService.name)
  private redis!: Redis

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.redis = new Redis(this.config.get<string>('REDIS_URL', 'redis://localhost:6379'))
    // An unhandled 'error' on an EventEmitter is an uncaught exception and this app installs
    // no process-level handler, so without this listener a Redis blip takes the API down.
    this.redis.on('error', (err: Error) => this.logger.error('Presenton session redis error', err))
  }

  onModuleDestroy() {
    this.redis?.disconnect()
  }

  /**
   * A usable session cookie for this user, provisioning the account on first use.
   *
   * Callers treat the result as possibly-stale and call `invalidate` on a 401 rather than
   * checking validity here: verifying up front would add a round trip to every request while
   * still racing with expiry.
   */
  async sessionFor(userId: string): Promise<string> {
    const cached = await this.cached(`${KEY_PREFIX}${userId}`)
    if (cached) return cached

    const username = presentonUsername(userId)
    const password = this.passwordFor(userId)

    let cookie = await this.login(username, password)
    if (!cookie) {
      // No such account yet, or its password predates the current secret. Creating it is
      // idempotent from our side: a 4xx here with a successful login on retry means another
      // request provisioned it first.
      await this.provision(username, password)
      cookie = await this.login(username, password)
    }
    if (!cookie) {
      throw new InternalServerErrorException('Could not establish a deck editor session')
    }

    await this.store(`${KEY_PREFIX}${userId}`, cookie)
    return cookie
  }

  /** Drops a cached cookie the generator has rejected, so the next call logs in again. */
  async invalidate(userId: string): Promise<void> {
    await this.redis.del(`${KEY_PREFIX}${userId}`).catch(() => undefined)
  }

  // --- internals ----------------------------------------------------------------------------

  /**
   * Derived, never stored. Base64url of an HMAC keeps it inside the generator's 128-char limit
   * and free of the whitespace its username/password validation rejects.
   */
  private passwordFor(userId: string): string {
    const secret = this.config.get<string>('PRESENTON_ACCOUNT_SECRET')
    if (!secret) {
      throw new InternalServerErrorException(
        'Deck editor accounts are not configured (PRESENTON_ACCOUNT_SECRET)',
      )
    }
    return createHmac('sha256', secret).update(userId).digest('base64url').slice(0, 32)
  }

  private baseUrl(): string {
    const baseUrl = this.config.get<string>('PRESENTON_BASE_URL')
    if (!baseUrl) {
      throw new InternalServerErrorException('Deck editor is not configured (PRESENTON_BASE_URL)')
    }
    return baseUrl.replace(/\/+$/, '')
  }

  /** Returns the `name=value` cookie pair, or null when the credentials are not accepted. */
  private async login(username: string, password: string): Promise<string | null> {
    const res = await fetch(`${this.baseUrl()}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return null
    return extractSessionCookie(res)
  }

  /**
   * Account creation needs an admin BROWSER session — `admin/users` rejects the API key with
   * "Admin browser session required" — so this logs in as the admin first.
   */
  private async provision(username: string, password: string): Promise<void> {
    const admin = await this.adminSession()
    const res = await fetch(`${this.baseUrl()}/api/v1/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admin },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok && res.status !== 409) {
      const body = (await res.text().catch(() => '')).slice(0, 200)
      // A 401/403 here means the admin session went stale between fetch and use; dropping it
      // lets the next attempt log in cleanly rather than reusing a dead cookie.
      if (res.status === 401 || res.status === 403) {
        await this.redis.del(ADMIN_KEY).catch(() => undefined)
      }
      this.logger.error(`Could not provision editor account ${username}: ${res.status} ${body}`)
      throw new InternalServerErrorException('Could not create a deck editor account')
    }
    this.logger.log(`Provisioned deck editor account ${username}`)
  }

  private async adminSession(): Promise<string> {
    const cached = await this.cached(ADMIN_KEY)
    if (cached) return cached

    const username = this.config.get<string>('PRESENTON_ADMIN_USERNAME')
    const password = this.config.get<string>('PRESENTON_ADMIN_PASSWORD')
    if (!username || !password) {
      throw new InternalServerErrorException(
        'Deck editor admin credentials are not configured ' +
          '(PRESENTON_ADMIN_USERNAME / PRESENTON_ADMIN_PASSWORD)',
      )
    }

    const cookie = await this.login(username, password)
    if (!cookie) {
      throw new InternalServerErrorException('Deck editor rejected the administrator credentials')
    }
    await this.store(ADMIN_KEY, cookie)
    return cookie
  }

  /** Redis being unavailable must cost a login, not the request. */
  private async cached(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key)
    } catch (err) {
      this.logger.warn(`Session cache read failed for ${key}: ${String(err)}`)
      return null
    }
  }

  private async store(key: string, cookie: string): Promise<void> {
    try {
      await this.redis.set(key, cookie, 'EX', SESSION_TTL_SECONDS)
    } catch (err) {
      this.logger.warn(`Session cache write failed for ${key}: ${String(err)}`)
    }
  }
}

/**
 * Pulls the session cookie out of a login response.
 *
 * `getSetCookie` rather than `get('set-cookie')`: the latter collapses multiple cookies into
 * one comma-joined string, and cookie values legitimately contain commas.
 */
export function extractSessionCookie(res: Response): string | null {
  const headers = res.headers.getSetCookie?.() ?? []
  for (const header of headers) {
    const pair = header.split(';')[0]?.trim()
    if (pair?.startsWith(`${SESSION_COOKIE}=`)) return pair
  }
  return null
}
