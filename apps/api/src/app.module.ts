import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { EventEmitterModule } from '@nestjs/event-emitter'
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
import { CollabModule } from './modules/collab/collab.module'
import { TagsModule } from './modules/tags/tags.module'
import { TrendingModule } from './modules/trending/trending.module'
import { ReportsModule } from './modules/reports/reports.module'
import { ChatModule } from './modules/chat/chat.module'
import { AiSummaryModule } from './modules/ai-summary/ai-summary.module'
import { ReadingListsModule } from './modules/reading-lists/reading-lists.module'
import { FeedbackModule } from './modules/feedback/feedback.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
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
    CollabModule,
    TagsModule,
    TrendingModule,
    ReportsModule,
    ChatModule,
    AiSummaryModule,
    ReadingListsModule,
    FeedbackModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
