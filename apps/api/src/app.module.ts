import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from '@thallesp/nestjs-better-auth'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { auth } from './auth/auth.config'
import { LoggerMiddleware } from './common/middleware'
import { PrismaModule } from './prisma/prisma.module'
import { StorageModule } from './modules/storage/storage.module'
import { CoursesModule } from './modules/courses/courses.module'
import { UsersModule } from './modules/users/users.module'
import { DepartmentsModule } from './modules/departments/departments.module'
import { PostsModule } from './modules/posts/posts.module'
import { FilesModule } from './modules/files/files.module'
import { NotificationsModule } from './modules/notifications/notifications.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    AuthModule.forRoot({ auth }),
    CoursesModule,
    UsersModule,
    DepartmentsModule,
    PostsModule,
    FilesModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL })
  }
}
