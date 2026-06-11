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

    this.adapterConstructor = createAdapter(pubClient, subClient)
    this.logger.log('Socket.IO Redis adapter connected')
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options)
    server.adapter(this.adapterConstructor)
    return server
  }
}
