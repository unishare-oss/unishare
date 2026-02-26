import { Module } from '@nestjs/common'
import { PostsController } from './posts.controller'
import { PostsRepository } from './posts.repository'
import { PostsService } from './posts.service'

@Module({
  controllers: [PostsController],
  providers: [PostsService, PostsRepository],
  exports: [PostsService],
})
export class PostsModule {}
