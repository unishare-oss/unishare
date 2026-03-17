import { Module } from '@nestjs/common'
import { FollowsController } from './follows.controller'
import { FollowsRepository } from './follows.repository'
import { FollowsService } from './follows.service'

@Module({
  controllers: [FollowsController],
  providers: [FollowsService, FollowsRepository],
  exports: [FollowsService],
})
export class FollowsModule {}
