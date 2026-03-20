import { Module } from '@nestjs/common'
import { FollowsModule } from '../follows/follows.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { TagsModule } from '../tags/tags.module'
import { TrendingModule } from '../trending/trending.module'
import { CommentsController } from './comments/comments.controller'
import { CommentsRepository } from './comments/comments.repository'
import { CommentsService } from './comments/comments.service'
import { PostsController } from './posts.controller'
import { PostsRepository } from './posts.repository'
import { PostsService } from './posts.service'

@Module({
  imports: [NotificationsModule, FollowsModule, TagsModule, TrendingModule],
  controllers: [PostsController, CommentsController],
  providers: [PostsService, PostsRepository, CommentsService, CommentsRepository],
  exports: [PostsService],
})
export class PostsModule {}
