import { Catch, ArgumentsHost, Logger } from '@nestjs/common'
import { BaseWsExceptionFilter } from '@nestjs/websockets'
import { Socket } from 'socket.io'

@Catch()
export class ChatWsExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(ChatWsExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    // 1. Call base handler for standard NestJS logging/handling
    super.catch(exception, host)

    // 2. Explicitly notify the client so their UI can show the error
    const client = host.switchToWs().getClient<Socket>()
    const details = exception instanceof Error ? exception.message : String(exception)

    this.logger.error(`WS Error for client ${client.id}: ${details}`)

    client.emit('error', {
      status: 'error',
      message: details,
    })
  }
}
