import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'node:crypto'
import Redis from 'ioredis'

/**
 * Callers pass a bare job name (`'ingestion-sweep'`), not a Redis key -- the namespace is
 * applied internally so multiple consumers cannot disagree about the prefix.
 *
 * `release` and `renew` are safe to call unconditionally: both are no-ops for a key this
 * instance does not currently hold, so a plain `try { ... } finally { await release(key) }`
 * cannot free a lock won by a different sweep. That guarantee is the whole reason the
 * `held` set exists -- see `release`.
 */
export interface CronLock {
  acquire(key: string, ttlMs: number): Promise<boolean>
  release(key: string): Promise<void>
  renew(key: string, ttlMs: number): Promise<void>
}

/** Namespace for every lock this service manages, so callers cannot collide by accident. */
const KEY_PREFIX = 'cron-lock:'

/**
 * A best-effort, Redis-backed mutex for scheduled jobs.
 *
 * Why this exists at all: production runs `api.replicas: 2` and `ScheduleModule` registers
 * `@Cron` handlers in EVERY replica, so every scheduled job in this app currently runs twice
 * per tick. An in-process boolean cannot see the other pod.
 */
@Injectable()
export class CronLockService implements CronLock, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CronLockService.name)
  private redis: Redis
  /** Distinguishes this pod's lock from another's, so release cannot free someone else's. */
  private readonly owner = `${process.pid}-${randomUUID()}`
  /**
   * Keys this instance currently believes it holds.
   *
   * The Lua owner comparison alone is not enough: `owner` is a per-process singleton, so a
   * sweep that LOST an acquire inside this pod presents a byte-identical owner string to the
   * one that won, and Redis cannot tell them apart. Tracking local ownership makes `release`
   * safe by construction instead of relying on every caller to remember an `if (acquired)`
   * guard -- Task 17 adds five more callers.
   */
  private readonly held = new Set<string>()

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.redis = new Redis(this.config.get<string>('REDIS_URL', 'redis://localhost:6379'))
    // Required, not decorative: an unhandled 'error' on an EventEmitter is an uncaught
    // exception, and this app installs no process-level handler, so a Redis blip without
    // this listener takes the API down.
    this.redis.on('error', (err: Error) => this.logger.error('Cron lock redis error', err))
  }

  onModuleDestroy() {
    this.redis.disconnect()
  }

  /**
   * Deliberately NOT a full distributed lock: no fencing token, no clock-skew handling.
   * The only consequence of a lost or double-granted lock here is a scheduled job running
   * twice -- which is what happens today, unconditionally -- so Redlock-grade machinery is
   * not warranted. `SET key owner PX ttl NX` is sufficient and atomic.
   */
  async acquire(key: string, ttlMs: number): Promise<boolean> {
    try {
      const acquired =
        (await this.redis.set(KEY_PREFIX + key, this.owner, 'PX', ttlMs, 'NX')) === 'OK'
      if (acquired) this.held.add(key)
      return acquired
    } catch (err) {
      // Redis down: run the job rather than silently stopping all scheduled work. Duplicate
      // execution is the pre-existing behaviour and is far better than a job that never runs
      // because a lock service was unavailable.
      //
      // Logged at error, not warn: this branch also swallows programming errors into a
      // permanent, silent "nothing is ever locked" state, which is not a warning-level fact.
      // Note the key is deliberately NOT added to `held` -- there is nothing to release.
      this.logger.error(`Lock ${key} unavailable, proceeding unlocked: ${(err as Error).message}`)
      return true
    }
  }

  /**
   * Compare-and-delete via Lua so the check and the delete are atomic. A plain GET-then-DEL
   * could delete a lock another pod acquired in the gap after this one's TTL expired.
   *
   * No-op when this instance does not hold the key, which makes the call safe from a
   * `finally` regardless of whether the matching `acquire` succeeded.
   */
  async release(key: string): Promise<void> {
    if (!this.held.delete(key)) return
    try {
      await this.redis.eval(
        'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
        1,
        KEY_PREFIX + key,
        this.owner,
      )
    } catch {
      // Leave it to the TTL.
    }
  }

  /**
   * Extends a held lock. Lets a long-running job keep the lock alive for as long as it is
   * actually making progress, which decouples "how long a sweep may take" from "how long
   * after a crash before another pod recovers the work". Without this, the TTL has to be
   * both longer than the worst-case sweep AND shorter than the staleness threshold, and at
   * SWEEP_BATCH_SIZE=20 those two constraints do not overlap.
   */
  async renew(key: string, ttlMs: number): Promise<void> {
    if (!this.held.has(key)) return
    try {
      await this.redis.eval(
        'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("pexpire", KEYS[1], ARGV[2]) else return 0 end',
        1,
        KEY_PREFIX + key,
        this.owner,
        String(ttlMs),
      )
    } catch {
      // Next renewal or the TTL will settle it.
    }
  }
}
