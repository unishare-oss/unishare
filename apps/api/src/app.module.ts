import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { AuthModule } from '@thallesp/nestjs-better-auth'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { auth } from './auth/auth.config'
import { PrismaModule } from './prisma/prisma.module'
import { StorageModule } from './modules/storage/storage.module'
import { CoursesModule } from './modules/courses/courses.module'
import { UsersModule } from './modules/users/users.module'
import { DepartmentsModule } from './modules/departments/departments.module'
import { PostsModule } from './modules/posts/posts.module'
import { FilesModule } from './modules/files/files.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { FollowsModule } from './modules/follows/follows.module'
import { PostRequestsModule } from './modules/post-requests/post-requests.module'
import { StatsModule } from './modules/stats/stats.module'
import { TasksModule } from './modules/tasks/tasks.module'
import { TagsModule } from './modules/tags/tags.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    StorageModule,
    AuthModule.forRoot({ auth }),
    CoursesModule,
    UsersModule,
    DepartmentsModule,
    PostsModule,
    FilesModule,
    NotificationsModule,
    StatsModule,
    FollowsModule,
    PostRequestsModule,
    TasksModule,
    TagsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
