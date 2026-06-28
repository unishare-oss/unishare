import { Module } from '@nestjs/common'
import { FollowsModule } from '../follows/follows.module'
import { ChatModule } from '../chat/chat.module'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
import { UsersRepository } from './users.repository'

@Module({
  imports: [FollowsModule, ChatModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
