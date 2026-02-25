import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from '@thallesp/nestjs-better-auth'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { auth } from './auth/auth.config'
import { PrismaModule } from './prisma/prisma.module'
import { CoursesModule } from './modules/courses/courses.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule.forRoot({ auth }),
    CoursesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
