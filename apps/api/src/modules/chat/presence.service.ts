import { Injectable, OnApplicationBootstrap, Logger, Inject } from '@nestjs/common'
import { Server } from 'socket.io'
import Redis from 'ioredis'
import { CONNECT_SCRIPT, DISCONNECT_SCRIPT } from './presence.scripts'

@Injectable()
export class PresenceService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PresenceService.name)
  private server: Server

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
  }

  async connect(userId: string): Promise<void> {
    const count = (await this.redis.eval(
      CONNECT_SCRIPT,
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
    const wentOffline = (await this.redis.eval(
      DISCONNECT_SCRIPT,
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
    return Promise.all(
      userIds.map(async (userId) => ({ userId, ...(await this.getStatus(userId)) })),
    )
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
