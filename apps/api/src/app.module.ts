import { Module } from '@nestjs/common'
import { AuthModule } from '@thallesp/nestjs-better-auth'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { auth } from './auth/auth.config'
import { PrismaModule } from './prisma/prisma.module'

@Module({
  imports: [PrismaModule, AuthModule.forRoot({ auth })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
