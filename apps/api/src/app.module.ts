import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { CacheModule } from '@nestjs/cache-manager'
import { ThrottlerModule } from '@nestjs/throttler'
import { ScheduleModule } from '@nestjs/schedule'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { AuthModule } from '@thallesp/nestjs-better-auth'
import KeyvRedis from '@keyv/redis'
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
import { QuizzesModule } from './modules/quizzes/quizzes.module'
import { ExamsModule } from './modules/exams/exams.module'
import { UniversitiesModule } from './modules/universities/universities.module'
import { RedisThrottlerStorageModule } from './common/redis-throttler-storage.module'
import { RedisThrottlerStorageService } from './common/redis-throttler-storage.service'
import { PrometheusModule } from '@willsoto/nestjs-prometheus'
import { MetricsController } from './metrics/metrics.controller'
import { MetricsModule } from './metrics/metrics.module'
import { McpModule } from './modules/mcp/mcp.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      imports: [RedisThrottlerStorageModule],
      inject: [RedisThrottlerStorageService],
      useFactory: (storage: RedisThrottlerStorageService) => ({
        throttlers: [{ ttl: 60000, limit: 20 }],
        storage,
      }),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        stores: [new KeyvRedis(config.get<string>('REDIS_URL', 'redis://localhost:6379'))],
      }),
    }),
    PrometheusModule.register({
      path: '/metrics',
      controller: MetricsController,
      defaultMetrics: { enabled: true },
    }),
    MetricsModule,
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
    QuizzesModule,
    ExamsModule,
    UniversitiesModule,
    McpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
