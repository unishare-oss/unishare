import { Injectable, OnApplicationBootstrap, Logger, Inject } from '@nestjs/common'
import { Server } from 'socket.io'
import Redis from 'ioredis'
import { CONNECT_SCRIPT, DISCONNECT_SCRIPT } from './presence.scripts'

@Injectable()
export class PresenceService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PresenceService.name)
  private server: Server
  private connectSha: string
  private disconnectSha: string

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  setServer(server: Server) {
    this.server = server
  }

  async onApplicationBootstrap() {
    // Wipe all presence data on startup to clear stale counters from a previous crash/restart.
    // NOTE: assumes Redis is only used for presence. If other features (queues, sessions, cache)
    // are added to Redis later, replace flushdb() with a targeted SCAN+DEL on presence:* keys.
    await this.redis.flushdb()
    this.logger.log('Cleared all presence data on startup')

    // Load Lua scripts once — EVALSHA sends only the SHA on every subsequent call instead of the full source.
    this.connectSha = (await this.redis.script('LOAD', CONNECT_SCRIPT)) as string
    this.disconnectSha = (await this.redis.script('LOAD', DISCONNECT_SCRIPT)) as string
    this.logger.log('Loaded presence Lua scripts')
  }

  async connect(userId: string): Promise<void> {
    const count = (await this.redis.evalsha(
      this.connectSha,
      2,
      `presence:${userId}:connections`,
      `presence:${userId}:lastSeen`,
    )) as number

    if (count === 1) {
      this.broadcast(userId, 1, null)
      this.logger.debug(`User ${userId} is now online`)
    }
  }

  async disconnect(userId: string): Promise<void> {
    const lastSeen = Date.now()
    const wentOffline = (await this.redis.evalsha(
      this.disconnectSha,
      2,
      `presence:${userId}:connections`,
      `presence:${userId}:lastSeen`,
      lastSeen.toString(),
    )) as number

    if (wentOffline) {
      this.broadcast(userId, 0, lastSeen)
      this.logger.debug(`User ${userId} is now offline`)
    }
  }

  async getStatus(userId: string): Promise<{ status: 0 | 1; lastSeen?: number }> {
    const count = parseInt((await this.redis.get(`presence:${userId}:connections`)) ?? '0', 10)
    if (count > 0) return { status: 1 }

    const lastSeen = await this.redis.get(`presence:${userId}:lastSeen`)
    return {
      status: 0,
      lastSeen: lastSeen ? parseInt(lastSeen, 10) : undefined,
    }
  }

  async getStatuses(
    userIds: string[],
  ): Promise<{ userId: string; status: 0 | 1; lastSeen?: number }[]> {
    if (userIds.length === 0) return []

    const pipeline = this.redis.pipeline()
    for (const userId of userIds) {
      pipeline.get(`presence:${userId}:connections`)
      pipeline.get(`presence:${userId}:lastSeen`)
    }
    const results = await pipeline.exec()
    if (!results) return userIds.map((userId) => ({ userId, status: 0 as const }))

    return userIds.map((userId, i) => {
      const [connErr, connVal] = results[i * 2]
      const [, lastSeenVal] = results[i * 2 + 1]

      const count = connErr ? 0 : parseInt((connVal as string | null) ?? '0', 10)
      if (count > 0) return { userId, status: 1 as const }

      const lastSeen = lastSeenVal as string | null
      return {
        userId,
        status: 0 as const,
        ...(lastSeen ? { lastSeen: parseInt(lastSeen, 10) } : {}),
      }
    })
  }

  private broadcast(userId: string, status: 0 | 1, lastSeen: number | null) {
    if (!this.server) return
    this.server.emit('user-presence', {
      userId,
      status,
      ...(status === 0 && lastSeen !== null ? { lastSeen } : {}),
    })
  }
}
