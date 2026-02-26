import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from '@thallesp/nestjs-better-auth'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { auth } from './auth/auth.config'
import { PrismaModule } from './prisma/prisma.module'
import { StorageModule } from './modules/storage/storage.module'
import { CoursesModule } from './modules/courses/courses.module'
import { UsersModule } from './modules/users/users.module'
import { DepartmentsModule } from './modules/departments/departments.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    AuthModule.forRoot({ auth }),
    CoursesModule,
    UsersModule,
    DepartmentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
