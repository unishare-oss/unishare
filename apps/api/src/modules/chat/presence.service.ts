import { Injectable, OnApplicationBootstrap, Logger, Inject } from '@nestjs/common'
import { Server } from 'socket.io'
import Redis from 'ioredis'
import { CONNECT_SCRIPT, DISCONNECT_SCRIPT, HEARTBEAT_SCRIPT } from './presence.scripts'

// Counter TTL: three missed 30s heartbeats before a user is considered gone.
export const PRESENCE_TTL_MS = 90_000

// ioredis custom commands defined in onApplicationBootstrap
interface PresenceCommands extends Redis {
  presenceConnect(connKey: string, lastSeenKey: string, ttlMs: string): Promise<number>
  presenceDisconnect(connKey: string, lastSeenKey: string, lastSeen: string): Promise<number>
  presenceHeartbeat(
    connKey: string,
    lastSeenKey: string,
    ttlMs: string,
    now: string,
  ): Promise<number>
}

@Injectable()
export class PresenceService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PresenceService.name)
  private server: Server

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  private get commands(): PresenceCommands {
    return this.redis as PresenceCommands
  }

  setServer(server: Server) {
    this.server = server
  }

  onApplicationBootstrap() {
    // defineCommand caches scripts and transparently recovers from NOSCRIPT
    // (e.g. after a Redis restart), unlike raw EVALSHA.
    // No startup flush: keys are TTL-bound, and Redis is shared with other
    // features (throttling, socket.io adapter) that must not be wiped.
    this.redis.defineCommand('presenceConnect', { numberOfKeys: 2, lua: CONNECT_SCRIPT })
    this.redis.defineCommand('presenceDisconnect', { numberOfKeys: 2, lua: DISCONNECT_SCRIPT })
    this.redis.defineCommand('presenceHeartbeat', { numberOfKeys: 2, lua: HEARTBEAT_SCRIPT })
    this.logger.log('Registered presence Lua commands')
  }

  async connect(userId: string): Promise<void> {
    const count = await this.commands.presenceConnect(
      `presence:${userId}:connections`,
      `presence:${userId}:lastSeen`,
      String(PRESENCE_TTL_MS),
    )

    if (count === 1) {
      this.broadcast(userId, 1, null)
      this.logger.debug(`User ${userId} is now online`)
    }
  }

  async disconnect(userId: string): Promise<void> {
    const lastSeen = Date.now()
    const wentOffline = await this.commands.presenceDisconnect(
      `presence:${userId}:connections`,
      `presence:${userId}:lastSeen`,
      lastSeen.toString(),
    )

    if (wentOffline) {
      this.broadcast(userId, 0, lastSeen)
      this.logger.debug(`User ${userId} is now offline`)
    }
  }

  async heartbeat(userId: string): Promise<void> {
    const revived = await this.commands.presenceHeartbeat(
      `presence:${userId}:connections`,
      `presence:${userId}:lastSeen`,
      String(PRESENCE_TTL_MS),
      Date.now().toString(),
    )

    // Counter had expired while the socket was still alive — re-announce online.
    if (revived === 1) {
      this.broadcast(userId, 1, null)
      this.logger.debug(`User ${userId} presence revived by heartbeat`)
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
