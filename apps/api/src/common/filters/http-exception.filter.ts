import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'

type ExceptionResponseBody =
  | string
  | {
      message?: string | string[]
      error?: string
      statusCode?: number
      [key: string]: unknown
    }

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const exceptionResponse =
      exception instanceof HttpException
        ? (exception.getResponse() as ExceptionResponseBody)
        : undefined

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    const message = this.getMessage(exception, exceptionResponse)

    const error =
      typeof exceptionResponse === 'object' && exceptionResponse?.error
        ? exceptionResponse.error
        : exception instanceof HttpException
          ? HttpStatus[exception.getStatus()]
          : 'INTERNAL_SERVER_ERROR'

    const stack = exception instanceof Error ? exception.stack : undefined
    const details = this.getDetails(exception, exceptionResponse)
    const requestDetails = `${request.method} ${request.path} ${status}`

    if (details) {
      this.logger.error(`${requestDetails} ${message} | details=${details}`, stack)
    } else {
      this.logger.error(`${requestDetails} ${message}`, stack)
    }

    response.status(status).json({
      success: false,
      message,
      error,
      path: request.path,
      timestamp: new Date().toISOString(),
    })
  }

  private getMessage(exception: unknown, exceptionResponse?: ExceptionResponseBody) {
    if (typeof exceptionResponse === 'string') return exceptionResponse

    if (Array.isArray(exceptionResponse?.message)) {
      return exceptionResponse.message.join(', ')
    }

    if (typeof exceptionResponse?.message === 'string') {
      return exceptionResponse.message
    }

    if (exception instanceof HttpException) {
      return exception.message
    }

    return 'Internal server error'
  }

  private getDetails(exception: unknown, exceptionResponse?: ExceptionResponseBody) {
    const details: Record<string, unknown> = {}

    if (typeof exceptionResponse === 'object' && exceptionResponse) {
      Object.assign(details, exceptionResponse)
    }

    if (exception instanceof Error) {
      details.errorName = exception.name

      const typedException = exception as Error & {
        cause?: unknown
        code?: string
      }

      if (typedException.code) {
        details.errorCode = typedException.code
      }

      if (typedException.cause) {
        details.cause =
          typedException.cause instanceof Error
            ? {
                name: typedException.cause.name,
                message: typedException.cause.message,
              }
            : typedException.cause
      }
    } else if (!exceptionResponse && exception !== undefined) {
      details.exception = exception
    }

    const serialized = JSON.stringify(details)
    return serialized === '{}' ? undefined : serialized
  }
}
