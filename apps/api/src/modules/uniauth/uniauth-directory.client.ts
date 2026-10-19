import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { uniauthConfig, uniauthDirectoryConfig } from '@/auth/uniauth-config'

/** A shared profile as uniauth's directory returns it (only the fields unishare uses). */
export interface DirectoryIdentity {
  id: string
  name?: string
  email?: string
  emailVerified?: boolean
  image?: string | null
  status: 'active' | 'suspended' | 'deleted'
  version: number
  /** University memberships (`urn:uniauth:organizations`), as in the ID token: `verified` = proven by the email domain. */
  'urn:uniauth:organizations'?: { id: string; verified: boolean }[]
}

export interface DirectoryChange {
  eventId: string
  type: string
  id: string
  version: number
}

/** The change feed's cursor is older than uniauth's retention: refresh known accounts with batch reads instead. */
export class ResyncRequired extends Error {}

const TIMEOUT_MS = 5_000

/**
 * The minimal server-side directory client unishare needs (read, batch, change feed), vendored from uniauth's
 * `@unishare-oss/uniauth-client` (packages/integration in the uniauth repo, not published): a machine token
 * (client_credentials, cached, shared between simultaneous callers, renewed after 80% of its life, one refresh when
 * refused), request timeouts, and a 503 whenever uniauth cannot answer, so an outage is never read as "not found".
 */
@Injectable()
export class UniauthDirectoryClient {
  private readonly logger = new Logger(UniauthDirectoryClient.name)
  private cached?: { value: string; refreshAt: number }
  private inFlight?: Promise<string>

  enabled(): boolean {
    return !!uniauthDirectoryConfig().clientId
  }

  private unavailable(why: string) {
    this.logger.error(why)
    return new ServiceUnavailableException('uniauth is not reachable right now')
  }

  private async fetchToken(): Promise<string> {
    const { clientId, clientSecret, origin } = uniauthDirectoryConfig()
    if (!clientId || !clientSecret) throw this.unavailable('directory credentials are not set')
    let res: Response
    try {
      res = await fetch(`${uniauthConfig.issuer}/oauth2/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          resource: `${origin}/api/directory`,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch (error) {
      throw this.unavailable(`token request failed: ${String(error)}`)
    }
    if (!res.ok) {
      await res.body?.cancel()
      throw this.unavailable(`token request answered ${res.status}`)
    }
    const body = (await res.json().catch(() => null)) as {
      access_token?: unknown
      expires_in?: unknown
    } | null
    if (typeof body?.access_token !== 'string')
      throw this.unavailable('token response had no access_token')
    const lifetimeMs =
      (typeof body.expires_in === 'number' && body.expires_in > 0 ? body.expires_in : 300) * 1000
    this.cached = { value: body.access_token, refreshAt: Date.now() + lifetimeMs * 0.8 }
    return this.cached.value
  }

  private token(refresh = false): Promise<string> {
    if (!refresh && this.cached && this.cached.refreshAt > Date.now())
      return Promise.resolve(this.cached.value)
    this.inFlight ??= this.fetchToken().finally(() => {
      this.inFlight = undefined
    })
    return this.inFlight
  }

  private async send(method: 'GET' | 'POST', path: string, body?: unknown): Promise<Response> {
    const { origin } = uniauthDirectoryConfig()
    for (const refresh of [false, true]) {
      const token = await this.token(refresh)
      let res: Response
      try {
        res = await fetch(`${origin}/api/directory/v1${path}`, {
          method,
          headers: {
            authorization: `Bearer ${token}`,
            ...(body !== undefined && { 'content-type': 'application/json' }),
          },
          ...(body !== undefined && { body: JSON.stringify(body) }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
      } catch (error) {
        throw this.unavailable(`request failed: ${String(error)}`)
      }
      if (res.status !== 401 || refresh) return res
      await res.body?.cancel() // refused: ask again with a fresh token
    }
    throw this.unavailable('unreachable')
  }

  private parse(data: unknown): DirectoryIdentity | null {
    const d = data as Record<string, unknown> | null
    if (!d || typeof d.id !== 'string' || typeof d.version !== 'number') return null
    if (!['active', 'suspended', 'deleted'].includes(String(d.status))) return null
    // A deleted account is a tombstone: the id, the status and the last version, no profile.
    if (d.status === 'deleted') return { id: d.id, status: 'deleted', version: d.version }
    return d as unknown as DirectoryIdentity
  }

  /** One account by uniauth id, or null if this client does not know it. */
  async read(id: string): Promise<DirectoryIdentity | null> {
    const res = await this.send('GET', `/users/${encodeURIComponent(id)}`)
    if (res.ok) {
      const identity = this.parse(
        ((await res.json().catch(() => null)) as { data?: unknown } | null)?.data,
      )
      if (!identity) throw this.unavailable('read answered 200 with an unexpected body')
      return identity
    }
    await res.body?.cancel()
    if (res.status === 404) return null
    throw this.unavailable(`read answered ${res.status}`)
  }

  /** Up to 100 known ids at once; `deleted` carries a tombstone, `not_found` means this client does not know the id. */
  async batch(
    ids: string[],
  ): Promise<
    Map<string, { result: 'found' | 'deleted' | 'not_found'; identity: DirectoryIdentity | null }>
  > {
    const res = await this.send('POST', '/users/batch', { ids })
    if (!res.ok) {
      await res.body?.cancel()
      throw this.unavailable(`batch answered ${res.status}`)
    }
    const results = (
      (await res.json().catch(() => null)) as {
        data?: { results?: { id?: unknown; result?: unknown; data?: unknown }[] }
      } | null
    )?.data?.results
    if (!Array.isArray(results))
      throw this.unavailable('batch answered 200 with an unexpected body')
    const byId = new Map<
      string,
      { result: 'found' | 'deleted' | 'not_found'; identity: DirectoryIdentity | null }
    >()
    for (const r of results) {
      if (
        typeof r.id !== 'string' ||
        !['found', 'deleted', 'not_found'].includes(String(r.result))
      ) {
        throw this.unavailable('batch answered 200 with an unexpected body')
      }
      byId.set(r.id, {
        result: r.result as 'found' | 'deleted' | 'not_found',
        identity: r.result === 'found' ? this.parse(r.data) : null,
      })
    }
    return byId
  }

  /** Changes to accounts this client knows since `cursor`, in commit order (never identity.created). */
  async changes(
    cursor: string | null,
    limit = 100,
  ): Promise<{ changes: DirectoryChange[]; cursor: string; hasMore: boolean }> {
    const query = new URLSearchParams({ limit: String(limit), ...(cursor && { cursor }) })
    const res = await this.send('GET', `/users/changes?${query}`)
    if (res.status === 410) {
      await res.body?.cancel()
      throw new ResyncRequired()
    }
    if (!res.ok) {
      await res.body?.cancel()
      throw this.unavailable(`changes answered ${res.status}`)
    }
    const data = (
      (await res.json().catch(() => null)) as {
        data?: { changes?: DirectoryChange[]; cursor?: string; hasMore?: boolean }
      } | null
    )?.data
    if (!data || !Array.isArray(data.changes) || typeof data.cursor !== 'string') {
      throw this.unavailable('changes answered 200 with an unexpected body')
    }
    return { changes: data.changes, cursor: data.cursor, hasMore: data.hasMore === true }
  }
}
