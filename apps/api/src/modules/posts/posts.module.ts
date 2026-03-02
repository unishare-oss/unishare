import { Module } from '@nestjs/common'
import { CommentsController } from './comments/comments.controller'
import { CommentsRepository } from './comments/comments.repository'
import { CommentsService } from './comments/comments.service'
import { PostsController } from './posts.controller'
import { PostsRepository } from './posts.repository'
import { PostsService } from './posts.service'

@Module({
  controllers: [PostsController, CommentsController],
  providers: [PostsService, PostsRepository, CommentsService, CommentsRepository],
  exports: [PostsService],
})
export class PostsModule {}
