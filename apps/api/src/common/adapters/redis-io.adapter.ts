import { IoAdapter } from '@nestjs/platform-socket.io'
import { ServerOptions } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import { Logger } from '@nestjs/common'

// Bridges Socket.IO broadcasts across api instances via Redis pub/sub.
// Without this, server.emit / server.to(room).emit only reach sockets
// connected to the local instance and multi-replica deployments silently
// drop messages for users on other pods.
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name)
  private adapterConstructor: ReturnType<typeof createAdapter>

  async connectToRedis(redisUrl: string): Promise<void> {
    const pubClient = new Redis(redisUrl)
    const subClient = pubClient.duplicate()

    pubClient.on('error', (err) => this.logger.error(`Redis pub client error: ${err.message}`))
    subClient.on('error', (err) => this.logger.error(`Redis sub client error: ${err.message}`))

    // Fail fast at boot if Redis is unreachable — a silently missing adapter
    // means cross-instance fanout is broken in a way that's hard to notice.
    await Promise.all([pubClient.ping(), subClient.ping()])

    this.adapterConstructor = createAdapter(pubClient, subClient)
    this.logger.log('Socket.IO Redis adapter connected')
  }

  createIOServer(port: number, options?: ServerOptions) {
    if (!this.adapterConstructor) {
      throw new Error('RedisIoAdapter: connectToRedis() must be awaited before the server starts')
    }
    const server = super.createIOServer(port, options)
    server.adapter(this.adapterConstructor)
    return server
  }
}
