import 'dotenv/config'
import { NestFactory, Reflector } from '@nestjs/core'
import { Logger, ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import metadata from './metadata'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    bufferLogs: true,
  })
  const reflector = app.get(Reflector)

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(new ResponseInterceptor(reflector))

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Unishare API')
      .setDescription('API for the Unishare platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build()

    await SwaggerModule.loadPluginMetadata(metadata)
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api', app, document)
  }

  const port = process.env.PORT ?? 3001
  await app.listen(port)
  logger.log(`API listening on http://localhost:${port}`)
}
bootstrap()
