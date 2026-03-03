import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name)

  use(request: Request, response: Response, next: NextFunction) {
    const { method, originalUrl } = request
    const startedAt = Date.now()

    response.on('finish', () => {
      const responseTime = Date.now() - startedAt
      this.logger.log(`${method} ${originalUrl} ${response.statusCode} +${responseTime}ms`)
    })

    next()
  }
}
