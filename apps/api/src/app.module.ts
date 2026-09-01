import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { CacheModule } from '@nestjs/cache-manager'
import { ThrottlerModule } from '@nestjs/throttler'
import { ScheduleModule } from '@nestjs/schedule'
import { BullModule } from '@nestjs/bullmq'
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
import { DecksModule } from './modules/decks/decks.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Parsed rather than passed through: ioredis takes a URL in its constructor, but
        // BullMQ's `connection` is an options object, so the URL has to be unpacked.
        const url = new URL(config.get<string>('REDIS_URL', 'redis://localhost:6379'))
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
            username: url.username || undefined,
            password: url.password || undefined,
            db: url.pathname && url.pathname !== '/' ? Number(url.pathname.slice(1)) : 0,
            // Required by BullMQ: blocking commands must not be retried out from under it.
            maxRetriesPerRequest: null,
            ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
          },
        }
      },
    }),
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
    DecksModule,
    ExamsModule,
    UniversitiesModule,
    McpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
