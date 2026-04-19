import { Module } from '@nestjs/common'
import { FollowsModule } from '../follows/follows.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { TagsModule } from '../tags/tags.module'
import { TrendingModule } from '../trending/trending.module'
import { AiSummaryModule } from '../ai-summary/ai-summary.module'
import { CommentsController } from './comments/comments.controller'
import { CommentsRepository } from './comments/comments.repository'
import { CommentsService } from './comments/comments.service'
import { PostsController } from './posts.controller'
import { PostsRepository } from './posts.repository'
import { PostsService } from './posts.service'
import { UserThrottlerGuard } from './guards/user-throttler.guard'

@Module({
  imports: [NotificationsModule, FollowsModule, TagsModule, TrendingModule, AiSummaryModule],
  controllers: [PostsController, CommentsController],
  providers: [
    PostsService,
    PostsRepository,
    CommentsService,
    CommentsRepository,
    UserThrottlerGuard,
  ],
  exports: [PostsService, PostsRepository],
})
export class PostsModule {}
