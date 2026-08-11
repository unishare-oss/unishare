import 'dotenv/config'
import helmet from 'helmet'
import { json } from 'express'
import { NestFactory, Reflector } from '@nestjs/core'
import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { RedisIoAdapter } from './common/adapters/redis-io.adapter'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { LoggerMiddleware } from './common/middleware'

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    bufferLogs: true,
  })
  const reflector = app.get(Reflector)

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:6274', //for mcp
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ]

  app.use(helmet({ contentSecurityPolicy: false }))
  app.enableCors({ origin: allowedOrigins, credentials: true })
  app.use('/mcp', json({ type: 'application/json', limit: '1mb' }))
  const loggerMiddleware = new LoggerMiddleware()
  app.use(loggerMiddleware.use.bind(loggerMiddleware))

  logger.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`)

  // Exclude health check and Better Auth routes (already prefixed with /api) from the global prefix
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'metrics', method: RequestMethod.GET },
      { path: 'mcp', method: RequestMethod.ALL },
      { path: '.well-known/(.*)', method: RequestMethod.GET },
      { path: 'api/(.*)', method: RequestMethod.ALL },
    ],
  })

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(new ResponseInterceptor(reflector))

  // Finish in-flight requests on SIGTERM so rolling deploys don't drop traffic
  app.enableShutdownHooks()

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Unishare API')
      .setDescription('API for the Unishare platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build()

    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('docs', app, document)
  }

  const redisIoAdapter = new RedisIoAdapter(app)
  await redisIoAdapter.connectToRedis(process.env.REDIS_URL ?? 'redis://localhost:6379')
  app.useWebSocketAdapter(redisIoAdapter)

  const port = process.env.PORT ?? 3001
  await app.listen(port)
  logger.log(`API listening on http://localhost:${port}`)
}
bootstrap()
