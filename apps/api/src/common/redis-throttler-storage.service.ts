import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ThrottlerStorage } from '@nestjs/throttler'
import Redis from 'ioredis'

interface ThrottlerStorageRecord {
  totalHits: number
  timeToExpire: number
  isBlocked: boolean
  timeToBlockExpire: number
}

/**
 * Redis-backed throttler storage using an atomic Lua script.
 * Ensures rate-limit state is shared across all API instances.
 *
 * TTL values use milliseconds throughout (matching @nestjs/throttler v6 conventions).
 */
@Injectable()
export class RedisThrottlerStorageService
  implements ThrottlerStorage, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisThrottlerStorageService.name)
  private redis: Redis

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.redis = new Redis(this.config.get<string>('REDIS_URL', 'redis://localhost:6379'))
    this.redis.on('error', (err: Error) => this.logger.error('Redis throttler error', err))
  }

  onModuleDestroy() {
    this.redis.disconnect()
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitKey = `throttler:${throttlerName}:${key}`
    const blockKey = `throttler:block:${throttlerName}:${key}`

    // Atomically increment the hit counter and manage block state.
    // - If blocked: return current block state without incrementing.
    // - On first hit: set expiry on the hit counter key.
    // - When limit exceeded: set block key and reset hit counter to expire with the block,
    //   so hits start fresh after the block window clears.
    const script = `
      local blockKey = KEYS[1]
      local hitKey   = KEYS[2]
      local ttl           = tonumber(ARGV[1])
      local limit         = tonumber(ARGV[2])
      local blockDuration = tonumber(ARGV[3])

      local blockTtl = redis.call('PTTL', blockKey)
      if blockTtl > 0 then
        local blocked = tonumber(redis.call('GET', blockKey)) or (limit + 1)
        return {blocked, 0, 1, blockTtl}
      end

      local hits   = redis.call('INCR', hitKey)
      local expire = redis.call('PTTL', hitKey)

      if hits == 1 or expire < 0 then
        redis.call('PEXPIRE', hitKey, ttl)
        expire = ttl
      end

      if hits > limit then
        redis.call('SET', blockKey, hits, 'PX', blockDuration)
        redis.call('SET', hitKey, 0, 'PX', blockDuration)
        return {hits, expire, 1, blockDuration}
      end

      return {hits, expire, 0, 0}
    `

    const [totalHits, timeToExpire, isBlocked, timeToBlockExpire] = (await this.redis.eval(
      script,
      2,
      blockKey,
      hitKey,
      ttl,
      limit,
      blockDuration,
    )) as number[]

    return {
      totalHits,
      timeToExpire: timeToExpire > 0 ? timeToExpire : ttl,
      isBlocked: isBlocked === 1,
      timeToBlockExpire: timeToBlockExpire ?? 0,
    }
  }
}
