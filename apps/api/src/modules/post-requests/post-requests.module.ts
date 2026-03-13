import { Module } from '@nestjs/common'
import { PostRequestsController } from './post-requests.controller'
import { PostRequestsRepository } from './post-requests.repository'
import { PostRequestsService } from './post-requests.service'

@Module({
  controllers: [PostRequestsController],
  providers: [PostRequestsService, PostRequestsRepository],
})
export class PostRequestsModule {}
