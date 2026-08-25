import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Response } from 'express'

@Catch()
export class McpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(McpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    if (response.headersSent) {
      return
    }

    let code = -32603 // JSON-RPC 2.0 Internal error
    let message = 'Internal server error'
    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus()
      message = exception.message
      if (httpStatus === HttpStatus.BAD_REQUEST) {
        code = -32602 // Invalid params
      } else if (httpStatus === HttpStatus.NOT_FOUND) {
        code = -32004
      } else if (httpStatus === HttpStatus.UNAUTHORIZED || httpStatus === HttpStatus.FORBIDDEN) {
        code = -32000
      }
    } else if (exception instanceof Error) {
      message = exception.message
    }

    const stack = exception instanceof Error ? exception.stack : undefined
    this.logger.error(`MCP Error [${code}]: ${message}`, stack)

    response.status(httpStatus).json({
      jsonrpc: '2.0',
      error: {
        code,
        message,
      },
      id: null,
    })
  }
}
